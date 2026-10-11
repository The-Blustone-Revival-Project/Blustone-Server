import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { socialDiscovery, LOCAL_SOCIAL_DISCOVERY_MAX_PAGE } from "../src/social-discovery.js";
import { emptySocialFriends, planSocialFriend } from "../src/social-friends.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const profiles = [
  { pvid: 1, nickname: "Self", serverId: 1 },
  { pvid: 3, nickname: "ALICE moon", serverId: 1 },
  { pvid: 2, nickname: "Alice Sun", serverId: 1 },
  { pvid: 4, nickname: "Alice Other Server", serverId: 2 },
  { pvid: 5, nickname: "Bob", serverId: 1 },
  { pvid: 6, nickname: "אליס", serverId: 1 },
].map((row) => ({ ...row, beginUtc: 0, lastLoginAt: 9999999999999, profile_url: "http://localhost/local-profile/replica-100.png" }));
const empty = emptySocialFriends();
const before = JSON.stringify({ empty, profiles });
const suggested = socialDiscovery(empty, 1, "suggested", { start: "0", length: "10" }, profiles, () => false);
assert.deepEqual(suggested.list.map((row) => row.target_pvid), [2, 3, 5, 6]);
assert.equal(suggested.length, 4);
assert.ok(suggested.list.every((row) => row.type === "candidate" && row.friend_id === 0 && row.tick === 0 && row.received_dtm === 0));
assert.deepEqual(socialDiscovery(empty, 1, "suggested", { start: 1, length: 2 }, profiles, () => false).list.map((row) => row.target_pvid), [3, 5]);
assert.deepEqual(socialDiscovery(empty, 1, "suggested", { start: 99, length: 10 }, profiles, () => false), { start: 99, length: 0, list: [] });
assert.deepEqual(socialDiscovery(empty, 1, "search", { start: 0, end: 10, target_nick_name: "  aLiCe  " }, profiles, () => false).list.map((row) => row.target_pvid), [2, 3]);
assert.equal(socialDiscovery(empty, 1, "search", { start: 0, end: 10, target_nick_name: "אליס" }, profiles, () => false).list[0].target_pvid, 6);
assert.deepEqual(socialDiscovery(empty, 1, "search", { start: 0, end: 10, target_nick_name: "not present" }, profiles, () => false), { start: 0, length: 0, list: [] });
const pending = planSocialFriend(empty, 1, "request", 2, (id) => profiles.find((row) => row.pvid === id), () => false, 10).next;
assert.deepEqual(socialDiscovery(pending, 1, "suggested", { start: 0, length: 10 }, profiles, (a, b) => a === 3 && b === 1).list.map((row) => row.target_pvid), [5, 6]);
for (const invalid of [true, -1, 1.5, "01", "1e0", Infinity, 0x100000000, undefined])
  assert.throws(() => socialDiscovery(empty, 1, "suggested", { start: invalid, length: 10 }, profiles, () => false));
assert.throws(() => socialDiscovery(empty, 1, "suggested", { start: 0, length: LOCAL_SOCIAL_DISCOVERY_MAX_PAGE + 1 }, profiles, () => false));
assert.throws(() => socialDiscovery(empty, 1, "search", { start: 5, end: 4, target_nick_name: "Alice" }, profiles, () => false));
for (const invalid of [undefined, "", " ", [], {}, "a".repeat(65), "a\u0000b"])
  assert.throws(() => socialDiscovery(empty, 1, "search", { start: 0, end: 10, target_nick_name: invalid }, profiles, () => false));
assert.throws(() => socialDiscovery(empty, 1, "suggested", { start: 0, length: 10 }, [...profiles, profiles[0]], () => false), /Duplicate/);
assert.equal(JSON.stringify({ empty, profiles }), before, "Discovery never changes graph, allocator or accounts");

const directory = mkdtempSync(path.join(tmpdir(), "blustone-social-discovery-"));
const filename = path.join(directory, "state.json");
try {
  const state = new ServerState("http://localhost", filename);
  const [a, b, c, d] = ["Self", "Alice", "ALICE Moon", "Other Server"].map((nickname) =>
    state.registerGuest({ device_id: `discover-${nickname}`, nickname }, {}).ret_data as any);
  (state as any).accountsByPvid.get(d.pvid).serverId = 2;
  (state as any).persist();
  const call = (server: ServerState, actor: any, name: string, extra = {}) => gameResponse(server, `/relation/${name}`, { ...actor, ...extra }) as any;
  const original = readFileSync(filename, "utf8");
  const rows = call(state, a, "GetSuggestedFriendList", { start: 0, length: 10 }).ret_data;
  assert.deepEqual(rows.list.map((row: any) => row.target_pvid), [b.pvid, c.pvid]);
  assert.equal(rows.start, 0);
  assert.equal(rows.length, 2);
  assert.ok(rows.list.every((row: any) => row.friend_id === 0 && row.type === "candidate"));
  assert.deepEqual(call(state, a, "FriendSearch", { target_nick_name: "alice", start: 0, end: 10 }).ret_data, rows);
  const brief = call(state, a, "GetTargetUserInfo", { list: `[${b.pvid}]` });
  assert.equal(brief.ret_data.list[0].pvid, b.pvid);
  assert.equal(brief.ret_data.list[0].nick_name, "Alice");
  assert.ok(!("token" in brief.ret_data.list[0]) && !("inst_id_leader" in brief.ret_data.list[0]));
  assert.notEqual(call(state, a, "GetTargetUserInfo", { list: `[${d.pvid}]` }).result_code, 1);
  assert.notEqual(call(state, a, "GetTargetUserInfo", { list: "[999999]" }).result_code, 1);
  assert.notEqual(call(state, a, "FriendSearch", { nick_name: "alice", start: 0, end: 10 }).result_code, 1, "Exact target_nick_name field is required");
  assert.equal(readFileSync(filename, "utf8"), original, "Discovery/brief reads do not migrate or persist private state");
  assert.throws(() => call(state, {}, "GetSuggestedFriendList", { start: 0, length: 10 }), /authenticated account required/);
  assert.throws(() => call(state, { otp: a.otp, pvid: b.pvid }, "FriendSearch", { target_nick_name: "alice", start: 0, end: 10 }), /account|identity|PVID|pvid/i);
  assert.equal(call(state, a, "FriendRequest", { target_pvid: b.pvid }).result_code, 1);
  assert.deepEqual(call(state, a, "GetSuggestedFriendList", { start: 0, length: 10 }).ret_data.list.map((row: any) => row.target_pvid), [c.pvid]);
  assert.deepEqual(call(state, b, "FriendSearch", { target_nick_name: "Self", start: 0, end: 10 }).ret_data.list, [], "Reverse pending relationships are excluded too");
  assert.equal(call(state, c, "Block", { target_list: `[${a.pvid}]` }).result_code, 1);
  const afterMutation = readFileSync(filename, "utf8");
  const restarted = new ServerState("http://localhost", filename);
  assert.deepEqual(call(restarted, a, "GetSuggestedFriendList", { start: 0, length: 10 }).ret_data.list, []);
  assert.notEqual(call(restarted, a, "GetTargetUserInfo", { list: `[${c.pvid}]` }).result_code, 1, "Either-direction blocking prevents public candidate profiles");
  assert.equal(readFileSync(filename, "utf8"), afterMutation);
  assert.deepEqual(JSON.parse(afterMutation).gameStates, JSON.parse(original).gameStates);
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log("Social discovery: original start/length/list and Search end grammar, real candidate identity, same-server/block/relationship exclusions, read-only public profiles, pagination/search/refusal/restart and exact save preservation passed; native UI remains unverified.");
