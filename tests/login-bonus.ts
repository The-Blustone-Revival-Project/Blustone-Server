import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { LOGIN_BONUS_DAYS, LOGIN_BONUS_GOLD, LOGIN_BONUS_VIP_EXP, loginBonusReference, normalizeLoginBonus } from "../src/login-bonus.js";
import { normalizeLocalGameState } from "../src/game.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "blustone-login-bonus-"));
const file = path.join(dir, "state.json"), realNow = Date.now;
try {
  let now = Date.parse("2026-10-05T08:00:00Z"); Date.now = () => now;
  let state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "login-calendar" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const req = (route: string, fields: Record<string, unknown> = {}) => gameResponse(state, route, { ...auth, ...fields }) as any;
  const read = () => req("/lobby/V2_GetSupplyInst").ret_data.login_bonus;
  const claim = (target_cnt: unknown) => req("/supply/LoginBonusReward", { target_cnt });
  assert.throws(() => state.claimLoginBonus({ target_cnt: 1 }, {}), /authenticated account required/);
  assert.notEqual(claim(1).result_code, 1, "no offered day before a real authenticated supply visit");
  const reference = loginBonusReference();
  assert.equal(reference.length, LOGIN_BONUS_DAYS);
  assert.deepEqual(reference.map((row) => row.target_cnt), Array.from({ length: 28 }, (_, i) => i + 1));
  assert.ok(reference.every((row) => row.gold === LOGIN_BONUS_GOLD && row.item_list === "[]" && row.card_list === "[]"));
  const stable = JSON.stringify([game.starter_cards, game.recruited_cards, game.items, game.decks, game.tutorial, game.stage_achievements]);
  const gold = game.gold;
  assert.equal(game.vip_exp, 0, "old profiles start at zero without retroactive claim awards");
  assert.equal(normalizeLocalGameState({}).vip_exp, 0);
  for (const vip_exp of [-1, 0x100000000, 0.5, "20"]) {
    assert.throws(() => normalizeLocalGameState({ vip_exp }), /Malformed Veteran EXP/);
  }
  assert.deepEqual(read(), { cur_value: 1, cycle: 1, cycle_log: [] });
  read(); assert.equal(game.login_bonus.eligible, 1); assert.equal(game.gold, gold, "visits offer, never auto-grant");
  for (const bad of [0, -1, 2, 29, 1.5, "", undefined]) {
    const before = JSON.stringify(game); assert.notEqual(claim(bad).result_code, 1); assert.equal(JSON.stringify(game), before);
  }
  const receipt = claim("1"); assert.equal(receipt.result_code, 1);
  assert.equal(receipt.ret_data.reward.user.gold.cur, gold + LOGIN_BONUS_GOLD);
  assert.deepEqual(receipt.ret_data.reward.user.vip_exp, { prev: 0, cur: LOGIN_BONUS_VIP_EXP });
  assert.equal(game.vip_exp, LOGIN_BONUS_VIP_EXP);
  assert.equal(receipt.ret_data.user, undefined, "LoginBonus nested reward parent differs from legacy AttendReward");
  assert.deepEqual(receipt.ret_data.inst, { cur_value: 1, cycle: 1, cycle_log: [1] });
  assert.equal(receipt.ret_data.dailyquest_min_stage, "");
  assert.notEqual(claim(1).result_code, 1); assert.equal(game.gold, gold + LOGIN_BONUS_GOLD);
  state = new ServerState("http://localhost", file); game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.vip_exp, LOGIN_BONUS_VIP_EXP, "Veteran EXP survives reload and duplicate claim");
  assert.deepEqual(read().cycle_log, [1]); assert.notEqual(claim(1).result_code, 1);
  now -= 86_400_000; assert.equal(read().cur_value, 1, "clock rollback cannot reopen or rewind a claim");
  now += 4 * 86_400_000; assert.equal(read().cur_value, 2, "missed days do not fabricate visits or rewards");
  assert.notEqual(claim(1).result_code, 1);
  const actualGold = game.gold; game.gold = Number.MAX_SAFE_INTEGER;
  const capacity = JSON.stringify(game); assert.notEqual(claim(2).result_code, 1); assert.equal(JSON.stringify(game), capacity);
  game.gold = actualGold;
  game.vip_exp = 0xffffffff;
  const vipCapacity = JSON.stringify(game);
  assert.notEqual(claim(2).result_code, 1);
  assert.equal(JSON.stringify(game), vipCapacity, "VIP overflow cannot pay gold or consume the offered day");
  game.vip_exp = LOGIN_BONUS_VIP_EXP;
  const beforeWriteFailure = JSON.stringify(game);
  const originalPersist = (state as any).persist;
  (state as any).persist = () => { throw new Error("simulated persistence failure"); };
  assert.throws(() => claim(2), /simulated persistence failure/);
  assert.equal(JSON.stringify(game), beforeWriteFailure, "both rewards and the claim roll back on write failure");
  (state as any).persist = originalPersist;
  assert.equal(claim(2).result_code, 1);
  assert.equal(game.vip_exp, 2 * LOGIN_BONUS_VIP_EXP);
  for (let i = 0; i < 35; i++) { now += 86_400_000; read(); }
  assert.equal(read().cur_value, LOGIN_BONUS_DAYS, "local one-time calendar caps, no invented new cycle");
  assert.equal(game.gold, gold + 2 * LOGIN_BONUS_GOLD, "unclaimed visits do not pay");
  assert.equal(game.vip_exp, 2 * LOGIN_BONUS_VIP_EXP, "visits and rejected claims cannot award Veteran EXP");
  assert.equal(JSON.stringify([game.starter_cards, game.recruited_cards, game.items, game.decks, game.tutorial, game.stage_achievements]), stable);
  const other = state.registerGuest({ device_id: "other-calendar" }, {}).ret_data as { otp: string };
  assert.notEqual(gameResponse(state, "/supply/LoginBonusReward", { ...other, target_cnt: 28 }).result_code, 1);
  assert.throws(() => normalizeLoginBonus({ last_visit_day: 1, eligible: 0, claimed: [] }), /Malformed/);
  assert.throws(() => normalizeLoginBonus({ last_visit_day: 1, eligible: 2, claimed: [1, 1] }), /Malformed/);
  console.log("Login bonus: native reference strings/receipt parents, actual visits, bounded calendar, exact claims, restart/rollback/capacity/isolation and no auto-grants passed; native UI pending.");
} finally { Date.now = realNow; rmSync(dir, { recursive: true, force: true }); }
