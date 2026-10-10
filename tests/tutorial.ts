import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { mergeTutorialRows } from "../src/tutorial.js";
import { normalizeLocalGameState } from "../src/game.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-tutorial-"));
try {
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://localhost", filename);
  const guest = state.registerGuest({ device_id: "tutorial-persistence" }, {}).ret_data as { otp: string };
  const auth = { otp: guest.otp };
  const game = state.gameFor(state.accountFor(auth, {}));
  const gold = game.gold;
  const items = JSON.stringify(game.items);
  const cards = JSON.stringify(game.starter_cards);
  const clear = { ...auth, type: "24", step: "0" };
  assert.deepEqual(gameResponse(state, "/tuto/Clear", clear).ret_data, { type: 24, step: 0 },
    "native callback must clear requested pair, not missing-field0/0");
  gameResponse(state, "/tuto/Clear", clear);
  assert.equal(game.tutorial.filter((row) => row.type === 24 && row.step === 0).length, 1);
  assert.equal(game.gold, gold);
  assert.equal(JSON.stringify(game.items), items);
  assert.equal(JSON.stringify(game.starter_cards), cards);
  const restarted = new ServerState("http://localhost", filename);
  const lobby = restarted.lobbyEnter(auth, {}).ret_data as { user: { tuto: Array<{ type: number; step: number; is_cleared: number }> } };
  assert.deepEqual(lobby.user.tuto.filter((row) => row.type === 24), [{ type: 24, step: 0, is_cleared: 1 }]);
  const login = restarted.login(auth, {}).ret_data as { tuto: Array<{ type: number; step: number; is_cleared: number }> };
  assert.equal(login.tuto.find((row) => row.type === 24)?.is_cleared, 1, "auto-login cannot reset completion");
  const other = restarted.registerGuest({ device_id: "tutorial-other" }, {}).ret_data as { otp: string };
  assert.equal(restarted.gameFor(restarted.accountFor({ otp: other.otp }, {})).tutorial.some((row) => row.type === 24), false);
  assert.deepEqual(mergeTutorialRows([{ type: 8, step: 0, is_cleared: 1 }], [{ type: 8, step: 0, is_cleared: 0 }]),
    [{ type: 8, step: 0, is_cleared: 1 }], "later false duplicates must not reset native state");
  assert.throws(() => normalizeLocalGameState({ tutorial: [{ type: 24, step: 0, is_cleared: "0" }] }),
    /Malformed persisted tutorial completion/, "ambiguous string0 must not become completed truth");
  // Invalid calls on the independently authenticated other account mutate nothing.
  for (const bad of [{}, { type: null, step: 0 }, { type: "", step: 0 }, { type: -1, step: 0 }, { type: 1, step: 1.5 }]) {
    assert.notEqual(restarted.clearTutorial({ otp: other.otp, ...bad }, {}).result_code, 1);
  }
  console.log("Tutorial: exact pair acknowledgement, persistence, merge precedence, isolation and no rewards passed.");
} finally { rmSync(directory, { recursive: true, force: true }); }
