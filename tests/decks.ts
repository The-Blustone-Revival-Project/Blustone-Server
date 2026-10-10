import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { normalizeLocalGameState } from "../src/game.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-decks-"));
try {
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://localhost", filename);
  const guest = state.registerGuest({ device_id: "deck-persistence" }, {}).ret_data as { otp: string };
  const auth = { otp: guest.otp };
  assert.deepEqual(state.gameFor(state.accountFor(auth, {})).decks[0].list, [2, 1, 0, 0, 0],
    "fresh corrected-role accounts start with a frontliner and captain support");
  const save = (rows: unknown) => gameResponse(state, "/world/SetDeck", { ...auth, deck_info: JSON.stringify(rows) });
  assert.equal(save([{ type: 1, list: [2, 1, 0, 0] }]).result_code, 1, "native four-slot request expands to five lobby fields");
  const restored = new ServerState("http://localhost", filename);
  const game = restored.gameFor(restored.accountFor(auth, {}));
  assert.deepEqual(game.decks, [{ type: 1, list: [2, 1, 0, 0, 0] }]);
  const lobby = restored.lobbyEnter(auth, {}).ret_data as Record<string, any>;
  assert.deepEqual(lobby.deck, [{ type: 1, inst_id_1: 2, inst_id_2: 1, inst_id_3: 0, inst_id_4: 0, inst_id_5: 0 }]);
  assert.equal(lobby.inst_id_1, 2);
  assert.equal(lobby.ref_id_1, "002");
  assert.equal(lobby.inst_id_2, 1);
  assert.equal(lobby.ref_id_2, "001");
  const battle = restored.startMission({ ...auth, stage_id: "n_01_01" }, {}).ret_data as any;
  assert.deepEqual(battle.battle.deck_inst_ids, [2, 1]);
  restored.toggleCardLock({ ...auth, target_inst_id: 2 }, {});
  assert.notEqual(restored.trainCard({ ...auth, target_inst_id: 1, source_inst_list: "[2]" }, {}).result_code, 1,
    "saved party source remains protected even when unlocked");
  for (const rows of [
    [{ type: 1, list: [2, 2, 0, 0] }], [{ type: 1, list: [999, 0, 0, 0] }],
    [{ type: 1, list: [0, 0, 0, 0] }],
    [{ type: 1, list: [1, 0, 0, 0] }, { type: 4, list: [999, 0, 0, 0] }],
  ]) assert.notEqual(save(rows).result_code, 1);
  assert.deepEqual(new ServerState("http://localhost", filename).gameFor(state.accountFor(auth, {})).decks,
    [{ type: 1, list: [2, 1, 0, 0, 0] }], "invalid batch cannot partially rewrite saved party");
  const refs = gameResponse(state, "/reference/GetCard", {}).ret_data as Array<any>;
  assert.equal(refs.find((card) => card.base.id === "001").base.role, 3);
  assert.equal(refs.find((card) => card.base.id === "002").base.attr, 3);
  const legacy = normalizeLocalGameState({ starter_cards: game.starter_cards.filter((card) => card.inst_id === 1), recruited_cards: [] });
  assert.deepEqual(legacy.decks[0].list, [1, 0, 0, 0, 0], "migration cannot recreate a previously consumed frontliner");
  console.log("Deck persistence: native shapes, four/five slots, profiles, protection and atomic refusal passed.");
} finally { rmSync(directory, { recursive: true, force: true }); }
