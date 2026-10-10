import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "../src/state.js";
import { ServerState as LegacyState } from "./legacy-state-fixture.js";
import { CARD_INSTANCE_BASE as BASE, CARD_INSTANCE_LIMIT as LIMIT, migrateCardInstanceNamespace } from "../src/card-instance-namespace.js";
import { gameResponse } from "../src/game-routes.js";

const dir = fs.mkdtempSync(path.join(tmpdir(), "blustone-native-card-ids-"));
const realNow = Date.now;
Date.now = () => 1_800_000_000_000;
try {
  const file = path.join(dir, "legacy.json");
  const old = new LegacyState("http://localhost", file);
  const guest = old.registerGuest({ device_id: "identity-preservation" }, {}).ret_data as any;
  const auth = { otp: guest.otp };
  const account = old.accountFor(auth, {});
  const original = old.gameFor(account);
  original.starter_cards[0].exp = 240;
  original.gold = 11480;
  original.next_card_inst_id += 9; // Allocation gaps are identities too.
  old.setDeck({ ...auth, deck_info: [{ type: 1, list: [1, 0, 0, 0] }] }, {});
  const beforeText = fs.readFileSync(file, "utf8");
  const before = JSON.parse(beforeText);
  const expected = structuredClone(before);
  expected.gameStates = before.gameStates.map(([pvid, game]: any[]) => [pvid, migrateCardInstanceNamespace(game)]);

  // Atomic migration failure must leave the original save untouched.
  const rename = fs.renameSync;
  try {
    fs.renameSync = () => { throw new Error("simulated namespace rename failure"); };
    syncBuiltinESMExports();
    assert.throws(() => new ServerState("http://localhost", file), /simulated namespace rename failure/);
    assert.equal(fs.readFileSync(file, "utf8"), beforeText);
  } finally { fs.renameSync = rename; syncBuiltinESMExports(); }

  const state = new ServerState("http://localhost", file);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), expected,
    "constructor persists only identity changes, preserving account/session/transport and game values");
  const savedText = fs.readFileSync(file, "utf8");
  const restarted = new ServerState("http://localhost", file);
  assert.equal(fs.readFileSync(file, "utf8"), savedText, "marker prevents a second migration/write");
  const login = restarted.login(auth, {}).ret_data as any;
  assert.equal(login.vs_token, guest.vs_token);
  const game = state.gameFor(state.accountFor(auth, {}));
  const inventory = state.cardInventory(auth, {}).ret_data as any[];
  assert.ok(inventory.every((row) => row.inst_id > BASE && row.inst_id < LIMIT));
  assert.equal(game.leader_inst_id, BASE + 1);
  assert.equal(game.gold, 11480);
  const lobby = state.lobbyEnter(auth, {}).ret_data as any;
  for (const suffix of ["leader", "1", "2", "3", "4"])
    assert.equal(lobby[`inst_id_${suffix}`], BASE + 1, "empty profile slot uses actual owned leader, never stale low1");
  assert.deepEqual(lobby.deck[0], { type: 1, inst_id_1: BASE + 1, inst_id_2: 0, inst_id_3: 0, inst_id_4: 0, inst_id_5: 0 });

  const ap = game.ap;
  const rejectedStart = state.startMission({ ...auth, stage_id: "n_01_01", deck_inst_id_1: 1 }, {});
  assert.equal((rejectedStart.ret_data as any).accepted, false);
  assert.notEqual(rejectedStart.result_code, 1, "native Start admission ignores accepted:false");
  assert.equal(game.ap, ap, "stale low card IDs never reserve fuel or create a battle");
  assert.equal(game.active_battle, null);
  assert.notEqual(state.toggleCardLock({ ...auth, target_inst_id: 1 }, {}).result_code, 1);
  assert.equal((state.toggleCardLock({ ...auth, target_inst_id: BASE + 1 }, {}).ret_data as any).inst_id, BASE + 1);
  assert.equal(state.startMission({ ...auth, stage_id: "n_01_01", deck_inst_id_1: BASE + 1 }, {}).result_code, 1);
  assert.deepEqual(game.active_battle!.deck_inst_ids, [BASE + 1]);
  const receipt = state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1,"clear_time":10,"dead_cnt":0}' }, {}).ret_data as any;
  assert.ok(Object.keys(receipt.card).every((id) => Number(id) > BASE));

  const draw = state.gachaPremium({ ...auth, cnt: 1 }, {}).ret_data as any;
  assert.equal(draw.cnt, 1);
  assert.ok(draw.card.inst_id > BASE);
  assert.equal(game.recruited_cards.at(-1)!.inst_id, draw.card.inst_id);
  game.next_card_inst_id = LIMIT;
  const capacityBefore = structuredClone(game);
  const refused = state.gachaPremium({ ...auth, cnt: 1 }, {}).ret_data as any;
  assert.equal(refused.error_code, "GACHA_INSTANCE_CAPACITY");
  assert.deepEqual(game, capacityBefore, "capacity refusal does not charge or alter ownership/counter");
  assert.notEqual(gameResponse(state, "/world/SetDeck", { ...auth, deck_info: [{ type: 1, list: [1, 0, 0, 0] }] }).result_code, 1);

  const fresh = new ServerState();
  const freshGuest = fresh.registerGuest({ device_id: "fresh-native-ids" }, {}).ret_data as any;
  assert.equal(fresh.gameFor(fresh.accountFor({ otp: freshGuest.otp }, {})).card_instance_namespace, 1);
  assert.ok((fresh.cardInventory({ otp: freshGuest.otp }, {}).ret_data as any[]).every((row) => row.inst_id > BASE));

  const corrupt = structuredClone(before);
  corrupt.gameStates[0][1].starter_cards.push({ inst_id: 0, ref_id: "001" });
  const malformedFile = path.join(dir, "malformed.json");
  const malformedText = JSON.stringify(corrupt);
  fs.writeFileSync(malformedFile, malformedText);
  assert.throws(() => new ServerState("http://localhost", malformedFile), /Invalid card instance namespace/);
  assert.equal(fs.readFileSync(malformedFile, "utf8"), malformedText, "raw malformed owned card cannot be silently filtered/replaced");
  for (const change of [
    (save: any) => { save.gameStates[0][1].next_card_inst_id = "99"; },
    (save: any) => { save.gameStates[0][1].leader_inst_id = "1"; },
    (save: any) => { save.gameStates[0][1].active_battle = { deck_inst_ids: [1, "2"] }; },
    (save: any) => { save.gameStates.push(structuredClone(save.gameStates[0])); },
  ]) {
    const save = structuredClone(before); change(save);
    const text = JSON.stringify(save); fs.writeFileSync(malformedFile, text);
    assert.throws(() => new ServerState("http://localhost", malformedFile), /Invalid card instance namespace|Duplicate game state/);
    assert.equal(fs.readFileSync(malformedFile, "utf8"), text, "bad raw identities/duplicate states cannot be normalized into a durable rewrite");
  }
  console.log("Native card IDs: production migration/restart, full save preservation, write failure, profile/deck/mutation/EXP, fresh allocation and capacity passed.");
} finally {
  Date.now = realNow;
  fs.rmSync(dir, { recursive: true, force: true }); // Exact generated test directory only.
}
