import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-recruitment-"));
try {
  const filename = path.join(directory, "state.json");
  const initial = new ServerState("http://localhost", filename);
  const guest = initial.registerGuest({ device_id: "recruitment-persistence" }, {}).ret_data as { otp: string };
  const payload = { otp: guest.otp };
  const before = initial.cardInventory(payload, {}).ret_data as Array<{ inst_id: number }>;
  const grant = initial.gachaPremium({ ...payload, cnt: 11 }, {}).ret_data as {
    card: Array<{ inst_id: number; ref_id: string; rank: number }>; user: { iap_qty: number; free_iap_qty: number };
  };
  assert.equal(grant.card.length, 11);
  const restored = new ServerState("http://localhost", filename);
  const inventory = restored.cardInventory(payload, {}).ret_data as Array<Record<string, unknown>>;
  assert.equal(inventory.length, before.length + 11, "all recruits survive restart");
  assert.equal(new Set(inventory.map((entry) => entry.inst_id)).size, inventory.length);
  for (const card of grant.card) {
    const owned = inventory.find((entry) => entry.inst_id === card.inst_id)!;
    assert.equal(owned.ref_id, card.ref_id);
    assert.equal(owned.rank, card.rank, "guaranteed grade survives restart");
    assert.equal(owned.index_id, undefined, "popup metadata is not persisted as inventory");
    assert.equal(owned.reward, undefined);
  }
  const game = restored.gameFor(restored.accountFor(payload, {}));
  assert.equal(game.gacha_iap_qty, grant.user.iap_qty);
  assert.equal(game.gacha_free_qty, grant.user.free_iap_qty);
  const login = restored.login(payload, {}).ret_data as { otp: string; iap_quantity: number; action_benefit_quantity: number };
  payload.otp = login.otp; // native login rotates only OTP; subsequent calls use its acknowledgement
  assert.equal(login.iap_quantity, game.gacha_iap_qty, "login cannot reset the native paid wallet display");
  assert.equal(login.action_benefit_quantity, game.gacha_free_qty);
  const second = restored.gachaPremium({ ...payload, cnt: 1 }, {}).ret_data as { cnt: number; card: { inst_id: number; ref_id: string } };
  assert.equal(second.cnt, 1);
  assert.equal(Array.isArray(second.card), false, "native single branch parses the WHOLE object, not array[0]");
  assert.ok(second.card.ref_id.length > 0);
  assert.ok(second.card.inst_id > Math.max(...inventory.map((entry) => Number(entry.inst_id))));
  const other = restored.registerGuest({ device_id: "other-recruitment-account" }, {}).ret_data as { otp: string };
  assert.equal((restored.cardInventory({ otp: other.otp }, {}).ret_data as unknown[]).length, before.length,
    "recruits belong only to their account");
  game.gacha_iap_qty = 0;
  game.gacha_free_qty = 0;
  const refused = restored.gachaPremium(payload, {}).ret_data as { cnt: number; card: unknown };
  assert.equal(refused.cnt, 0);
  assert.equal(refused.card, null, "native cnt<=1 only skips parsing for null card");
  assert.equal(game.recruited_cards.length, 12, "refusal grants no phantom cards");
  // Profile changes must fail before writing the saved ownership. Separate
  // processes re-evaluate bootstrap's import-time environment settings.
  const snapshot = readFileSync(filename, "utf8");
  for (const changes of [{ BLUSTONE_PARTY_SIZE: "5" }, { BLUSTONE_GACHA_CARD: "0" }]) {
    const probe = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
      "import { ServerState } from './tests/legacy-state-fixture.ts'; new ServerState('http://localhost', process.argv[1]);", filename],
    { encoding: "utf8", env: { ...process.env, ...changes } });
    assert.notEqual(probe.status, 0, "incompatible roster profile must refuse existing ownership");
    assert.match(probe.stderr, /Refusing to overwrite ownership/);
    assert.equal(readFileSync(filename, "utf8"), snapshot, "failed restore leaves save untouched");
  }
  const duplicate = JSON.parse(snapshot);
  duplicate.gameStates[0][1].recruited_cards[0].inst_id = 1;
  writeFileSync(filename, JSON.stringify(duplicate));
  assert.throws(() => new ServerState("http://localhost", filename), /conflicts with a persisted recruited card ID/);
  console.log("Recruitment persistence: grants, currency, unique IDs, isolation and refusal passed.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
