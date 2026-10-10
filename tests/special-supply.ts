import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { normalizeSpecialSupply, SPECIAL_CLEAR_GOLD } from "../src/special-supply.js";
import { gameResponse } from "../src/game-routes.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "blustone-special-"));
try {
  const file = path.join(dir, "state.json");
  let state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "special" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const claim = (id_list: unknown) => state.claimSpecialSupply({ ...auth, id_list }, {}) as any;
  assert.equal(game.special_supply.rows.length, 0, "no starter or migrated grants");
  state.startMission({ ...auth, stage_id: "n_01_01" }, {});
  state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":0}' }, {});
  assert.equal(game.special_supply.rows.length, 0);
  for (const stage_id of ["n_01_01", "n_01_02"]) {
    assert.equal(state.startMission({ ...auth, stage_id }, {}).result_code, 1);
    state.completeMission({ ...auth, stage_id, play_info: '{"clear":1}' }, {});
  }
  assert.equal(game.special_supply.rows.length, 2);
  const list = () => (gameResponse(state, "/supply/RefreshSpecialList", auth) as any).ret_data.special;
  assert.equal(list().length, 2);
  assert.equal(list()[0].npc_id, "C001"); assert.equal(list()[0].expire_date, 0);
  assert.equal(list()[0].str_param, ""); assert.deepEqual(list()[0].item_list, []);
  assert.equal((state.lobbyEnter(auth, {}) as any).ret_data.special.length, 2);
  const ids = game.special_supply.rows.map((row) => row.id);
  const before = JSON.stringify(game);
  for (const bad of [ids, "", "[]", "1,2,", '["1"]', "[0]", "[1,1]", "[1,999]"]) {
    assert.notEqual(claim(bad).result_code, 1);
    assert.equal(JSON.stringify(game), before, "whole batch refusal preserves all state");
  }
  const other = state.registerGuest({ device_id: "special-other" }, {}).ret_data as { otp: string };
  assert.notEqual(state.claimSpecialSupply({ ...other, id_list: JSON.stringify(ids) }, {}).result_code, 1);
  state = new ServerState("http://localhost", file); game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.special_supply.rows.filter((row) => !row.claimed).length, 2);
  const oldGold = game.gold;
  const nonRewards = JSON.stringify({ ...game, gold: null, special_supply: null });
  game.gold = 0xffffffff;
  const overflow = JSON.stringify(game);
  assert.notEqual(claim(JSON.stringify(ids)).result_code, 1);
  assert.equal(JSON.stringify(game), overflow);
  game.gold = oldGold;
  assert.deepEqual(claim(JSON.stringify(ids)).ret_data, { target_inst_id: ids,
    user: { gold: { prev: oldGold, cur: oldGold + 2 * SPECIAL_CLEAR_GOLD } } });
  assert.equal(JSON.stringify({ ...game, gold: null, special_supply: null }), nonRewards);
  assert.equal(game.special_supply.rows.every((row) => row.claimed), true);
  assert.deepEqual(list(), []);
  state = new ServerState("http://localhost", file); game = state.gameFor(state.accountFor(auth, {}));
  const settled = JSON.stringify(game);
  assert.deepEqual(claim(JSON.stringify(ids)).ret_data, { target_inst_id: ids });
  assert.equal(JSON.stringify(game), settled, "restart retry cannot pay twice");
  state.startMission({ ...auth, stage_id: "n_01_01" }, {});
  state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
  assert.equal(game.special_supply.rows.length, 2, "replaying a first clear cannot issue another supply");
  const capsule = game.items.find((row) => row.ref_id === "AIRSHIP_TICKET")!;
  capsule.qty = 0xffffffff;
  assert.equal(state.startMission({ ...auth, stage_id: "n_01_03" }, {}).result_code, 1);
  state.completeMission({ ...auth, stage_id: "n_01_03", play_info: '{"clear":1}' }, {});
  assert.equal(capsule.qty, 0xffffffff);
  assert.equal(game.special_supply.rows.length, 3, "capsule capacity cannot lose the independently earned gold supply");
  assert.deepEqual(normalizeSpecialSupply(undefined), { next_id: 1, rows: [] });
  assert.throws(() => normalizeSpecialSupply({ ...game.special_supply, rows: [...game.special_supply.rows, game.special_supply.rows[0]] }), /Malformed/);
  console.log("Special Supply: future earned source, durable pending/claims, native gold pairs/ID arrays, atomic refusal, overflow and owner isolation passed; native UI pending.");
} finally { rmSync(dir, { recursive: true, force: true }); }
