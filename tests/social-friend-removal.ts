import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { emptySocialFriends, normalizeSocialFriends, planSocialFriend, planSocialFriendRemoval, socialFriendIdList, socialFriendList } from "../src/social-friends.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const profiles = new Map([1, 2, 3].map((pvid) => [pvid, { pvid, nickname: `Local ${pvid}`, serverId: 1,
  beginUtc: 0, lastLoginAt: 0, profile_url: "" }]));
const lookup = (id: number) => profiles.get(id);
const a = planSocialFriend(emptySocialFriends(), 1, "request", 2, lookup, () => false, 10).next;
const pending = planSocialFriend(a, 1, "request", 3, lookup, () => false, 11).next;
const pendingBefore = JSON.stringify(pending);
assert.throws(() => planSocialFriendRemoval(pending, 2, "cancel", [1], lookup), /owned/);
assert.throws(() => planSocialFriendRemoval(pending, 1, "reject", [1], lookup), /owned/);
assert.throws(() => planSocialFriendRemoval(pending, 1, "cancel", [1, 999], lookup), /owned/);
assert.equal(JSON.stringify(pending), pendingBefore, "A failing second batch member cannot cancel the first");
const cancelled = planSocialFriendRemoval(pending, 1, "cancel", "[1,2,1]", lookup);
assert.deepEqual(cancelled.receipt, { friend_id_list: [1, 2] });
assert.deepEqual(socialFriendList(cancelled.next, 2, 3, lookup), { list: [] });
const fresh = planSocialFriend(cancelled.next, 1, "request", 2, lookup, () => false, 20);
assert.deepEqual(fresh.receipt, { friend_id: 3, target_pvid: 2 });
const staleRetry = planSocialFriendRemoval(fresh.next, 1, "cancel", [1, 2], lookup);
assert.deepEqual(staleRetry.next, fresh.next, "Stale deletion receipts cannot cancel a new relationship with the same peer");
assert.throws(() => planSocialFriend(staleRetry.next, 2, "accept", 1, lookup, () => false, 30), /incoming/);
const accepted = planSocialFriend(fresh.next, 2, "accept", 3, lookup, () => false, 30).next;
assert.throws(() => planSocialFriendRemoval(accepted, 1, "cancel", [3], lookup), /lifecycle/);
assert.throws(() => planSocialFriendRemoval(accepted, 3, "unfriend", [3], lookup), /owned/);
const removed = planSocialFriendRemoval(accepted, 2, "unfriend", [3], lookup);
assert.deepEqual(removed.receipt, { friend_id_list: [3] });
assert.deepEqual(socialFriendList(removed.next, 1, 1, lookup), { list: [] });
assert.deepEqual(planSocialFriendRemoval(removed.next, 1, "unfriend", [3], lookup).next, removed.next);
assert.equal(removed.next.next_id, 4, "History preserves allocator after all active relationships disappear");
const rejection = planSocialFriendRemoval(pending, 2, "reject", [1], lookup);
assert.equal(rejection.next.relations[0].state, "rejected");
assert.equal(rejection.next.relations[1].state, "pending");
assert.deepEqual(planSocialFriendRemoval(rejection.next, 2, "reject", [1], lookup).next, rejection.next);
for (const raw of [null, {}, "1,2", "{}", [], ["1"], [0], [true], [1.5], [Number.MAX_SAFE_INTEGER + 1]])
  assert.throws(() => socialFriendIdList(raw));
assert.throws(() => normalizeSocialFriends({ next_id: 3, relations: [pending.relations[0], { ...pending.relations[0], friend_id: 2 }] }), /Malformed/);

const directory = mkdtempSync(path.join(tmpdir(), "blustone-friend-removal-"));
const filename = path.join(directory, "state.json");
try {
  const state = new ServerState("http://localhost", filename);
  const accounts = ["A", "B", "C", "D"].map((nickname) => state.registerGuest({ device_id: `remove-${nickname}`, nickname }, {}).ret_data as any);
  (state as any).persist();
  const gamesBefore = JSON.parse(readFileSync(filename, "utf8")).gameStates;
  const [aa, bb, cc, dd] = accounts;
  const call = (server: ServerState, actor: any, name: string, extra = {}) => gameResponse(server, `/relation/${name}`, { ...actor, ...extra }) as any;
  const req = (peer: any) => call(state, aa, "FriendRequest", { target_pvid: peer.pvid }).ret_data.friend_id;
  const first = req(bb), second = req(cc);
  const pendingBytes = readFileSync(filename, "utf8");
  assert.notEqual(call(state, aa, "FriendReqCancel", { target_friend_id_list: `[${first},999999]` }).result_code, 1);
  assert.notEqual(call(state, bb, "FriendReqCancel", { target_friend_id_list: [first] }).result_code, 1);
  assert.notEqual(call(state, aa, "FriendReqReject", { target_friend_id_list: [first] }).result_code, 1);
  assert.equal(readFileSync(filename, "utf8"), pendingBytes);
  assert.deepEqual(call(state, bb, "FriendReqReject", { target_friend_id_list: `[${first}]` }).ret_data, { friend_id_list: [first] });
  assert.deepEqual(call(state, aa, "FriendReqCancel", { target_friend_id_list: [second] }).ret_data, { friend_id_list: [second] });
  const historyBytes = readFileSync(filename, "utf8");
  const restarted = new ServerState("http://localhost", filename);
  assert.deepEqual(call(restarted, bb, "FriendReqReject", { target_friend_id_list: [first] }).ret_data, { friend_id_list: [first] });
  assert.deepEqual(call(restarted, aa, "FriendReqCancel", { target_friend_id_list: [second] }).ret_data, { friend_id_list: [second] });
  assert.equal(readFileSync(filename, "utf8"), historyBytes);
  const third = call(restarted, aa, "FriendRequest", { target_pvid: bb.pvid }).ret_data.friend_id;
  const fourth = call(restarted, aa, "FriendRequest", { target_pvid: cc.pvid }).ret_data.friend_id;
  assert.ok(third > second && fourth > third);
  assert.equal(call(restarted, bb, "FriendReqAccept", { target_friend_id: first }).result_code, 2001, "Rejected history cannot be resurrected by stale accept");
  assert.equal(call(restarted, bb, "FriendReqAccept", { target_friend_id: third }).result_code, 1);
  assert.equal(call(restarted, cc, "FriendReqAccept", { target_friend_id: fourth }).result_code, 1);
  const acceptedBytes = readFileSync(filename, "utf8");
  assert.notEqual(call(restarted, dd, "Unfriend", { target_friend_id_list: [third] }).result_code, 1);
  assert.notEqual(call(restarted, aa, "Unfriend", { target_friend_id_list: [third, 999999] }).result_code, 1);
  assert.notEqual(call(restarted, aa, "Unfriend", { friend_id_list: [third] }).result_code, 1, "The request key differs from the receipt key");
  assert.equal(readFileSync(filename, "utf8"), acceptedBytes);
  mkdirSync(`${filename}.tmp`);
  assert.notEqual(call(restarted, aa, "Unfriend", { target_friend_id_list: [third, fourth] }).result_code, 1);
  assert.equal(call(restarted, aa, "GetList", { type: 1 }).ret_data.list.length, 2, "Failed persistence restores every member of both views");
  assert.equal(call(restarted, bb, "GetList", { type: 1 }).ret_data.list.length, 1);
  assert.equal(call(restarted, cc, "GetList", { type: 1 }).ret_data.list.length, 1);
  assert.equal(readFileSync(filename, "utf8"), acceptedBytes);
  rmSync(`${filename}.tmp`, { recursive: true });
  assert.deepEqual(call(restarted, aa, "Unfriend", { target_friend_id_list: `[${third},${fourth},${third}]` }).ret_data,
    { friend_id_list: [third, fourth] });
  assert.deepEqual(call(restarted, aa, "GetList", { type: 1 }).ret_data, { list: [] });
  assert.notEqual(call(restarted, aa, "GetTargetUserInfo", { list: `[${bb.pvid}]` }).result_code, 1,
    "Historical tombstones do not authorize a removed peer profile");
  const removedBytes = readFileSync(filename, "utf8");
  const final = new ServerState("http://localhost", filename);
  assert.deepEqual(call(final, aa, "Unfriend", { target_friend_id_list: [third, fourth] }).ret_data,
    { friend_id_list: [third, fourth] });
  assert.equal(readFileSync(filename, "utf8"), removedBytes, "Restarted cleanup retries do not rewrite history");
  assert.deepEqual(JSON.parse(removedBytes).gameStates, gamesBefore);
  assert.throws(() => call(final, {}, "Unfriend", { target_friend_id_list: [third] }), /authenticated account required/);
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log("Friend lifecycle cleanup: native asymmetric list keys, owned cancel/reject/unfriend, atomic batches, bilateral rollback, restart-safe history, stale-retry isolation and unchanged game states passed; native UI remains unverified.");
