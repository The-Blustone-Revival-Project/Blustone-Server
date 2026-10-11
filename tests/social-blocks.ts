import assert from "node:assert/strict";
import { changeSocialBlocks, socialBlockRows, socialTargetList } from "../src/social-blocks.js";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const names = new Map([[2, "Nene"], [3, "Tyltyl"]]);
const lookup = (pvid: number) => names.get(pvid);
const empty = {};
const blocked = changeSocialBlocks(empty, 1, "[3,2,3]", "block", lookup);
assert.deepEqual(blocked, { "2": "Nene", "3": "Tyltyl" });
assert.deepEqual(empty, {});
assert.deepEqual(socialBlockRows(blocked), [
  { target_pvid: 2, target_nickname: "Nene" },
  { target_pvid: 3, target_nickname: "Tyltyl" },
]);
assert.deepEqual(socialBlockRows({}), [], "Wire list is an array, not the internal native map");
const unblocked = changeSocialBlocks(blocked, 1, [3], "unblock", () => undefined);
assert.deepEqual(unblocked, { "2": "Nene" }, "Unblocking works if the original target has disappeared");
assert.deepEqual(blocked, { "2": "Nene", "3": "Tyltyl" });
assert.throws(() => changeSocialBlocks(empty, 1, [2, 999], "block", lookup), /Unknown/);
assert.deepEqual(empty, {}, "Invalid target at the end cannot partly mutate a batch");
assert.throws(() => changeSocialBlocks(blocked, 1, [2, 999], "unblock", lookup), /not blocked/);
assert.deepEqual(blocked, { "2": "Nene", "3": "Tyltyl" });
assert.throws(() => changeSocialBlocks(empty, 1, [2, 1], "block", lookup), /yourself/);
assert.throws(() => changeSocialBlocks(blocked, 1, [2], "block", lookup), /already/);
for (const bad of [null, {}, "{}", "2,3", [], [0], [-1], [1.5], ["2"], [true], [2 ** 53]])
  assert.throws(() => socialTargetList(bad), TypeError);
assert.deepEqual(socialTargetList("[2,2,3]"), [2, 3]);
assert.throws(() => socialBlockRows({ "02": "Nene" }), TypeError);
assert.throws(() => socialBlockRows({ "2": "" }), TypeError);

const directory = mkdtempSync(path.join(tmpdir(), "blustone-social-blocks-"));
const filename = path.join(directory, "state.json");
try {
  const state = new ServerState("http://localhost", filename);
  const a = state.registerGuest({ device_id: "block-a", nickname: "A" }, {}).ret_data as any;
  const b = state.registerGuest({ device_id: "block-b", nickname: "B" }, {}).ret_data as any;
  const c = state.registerGuest({ device_id: "block-c", nickname: "C" }, {}).ret_data as any;
  const game = state.gameFor(state.accountFor(a, {}));
  const gameBefore = JSON.stringify(game);
  const call = (actor: any, route: string, extra = {}) => gameResponse(state, `/relation/${route}`, { ...actor, ...extra }) as any;
  const bytesBeforeRead = readFileSync(filename, "utf8");
  assert.deepEqual(call(a, "BlockList").ret_data, []);
  assert.equal(readFileSync(filename, "utf8"), bytesBeforeRead, "Legacy read does not migrate or rewrite unrelated state");
  assert.throws(() => call({}, "BlockList"), /authenticated account required/);
  assert.throws(() => call({ otp: a.otp, pvid: b.pvid }, "Block", { target_list: `[${c.pvid}]` }), /account|identity|PVID|pvid/i);
  const result = call(a, "Block", { target_list: `[${b.pvid}]`, target_nickname: "Forged" });
  assert.equal(result.result_code, 1);
  assert.deepEqual(result.ret_data, [{ target_pvid: b.pvid, target_nickname: "B" }]);
  assert.deepEqual(call(b, "BlockList").ret_data, [], "Block state belongs to the authenticated caller");
  assert.deepEqual(call(c, "BlockList").ret_data, []);
  assert.equal(JSON.stringify(game), gameBefore, "Social mutations do not touch game progression/wallet");
  const afterBlock = readFileSync(filename, "utf8");
  assert.notEqual(call(a, "Block", { target_list: `[${c.pvid},99999999]` }).result_code, 1);
  assert.notEqual(call(a, "Unblock", { target_list: `[${b.pvid},${c.pvid}]` }).result_code, 1);
  assert.equal(readFileSync(filename, "utf8"), afterBlock, "Invalid batches never partially persist");
  const restarted = new ServerState("http://localhost", filename);
  assert.deepEqual((gameResponse(restarted, "/relation/BlockList", a) as any).ret_data, result.ret_data);
  assert.equal((gameResponse(restarted, "/relation/Unblock", { ...a, target_list: `[${b.pvid}]` }) as any).result_code, 1);
  const restartedAgain = new ServerState("http://localhost", filename);
  assert.deepEqual((gameResponse(restartedAgain, "/relation/BlockList", a) as any).ret_data, []);
  mkdirSync(`${filename}.tmp`);
  assert.throws(() => gameResponse(restartedAgain, "/relation/Block", { ...a, target_list: `[${b.pvid}]` }));
  assert.deepEqual((gameResponse(restartedAgain, "/relation/BlockList", a) as any).ret_data, [], "Failed persistence rolls memory back");
  rmSync(`${filename}.tmp`, { recursive: true });
  const malformed = JSON.parse(readFileSync(filename, "utf8"));
  malformed.accounts[0].socialBlocks = [];
  const corruptBytes = JSON.stringify(malformed);
  writeFileSync(filename, corruptBytes);
  assert.throws(() => new ServerState("http://localhost", filename), /Malformed social blocks/);
  assert.equal(readFileSync(filename, "utf8"), corruptBytes, "Malformed social state is preserved for recovery");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("Social blocks: native row grammar, strict target batch, identity resolution and atomic immutable transitions passed.");
