import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { emptySocialFriends, normalizeSocialFriends, planSocialFriend, socialFriendList } from "../src/social-friends.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const profiles = new Map([1, 2, 3].map((pvid) => [pvid, { pvid, nickname: `Local ${pvid}`, serverId: 1,
  beginUtc: 0, lastLoginAt: 0, profile_url: "" }]));
const profile = (id: number) => profiles.get(id);
const empty = emptySocialFriends();
const pending = planSocialFriend(empty, 1, "request", "2", profile, () => false, 1000);
assert.deepEqual(empty, emptySocialFriends(), "Pure planning never changes the original graph");
assert.deepEqual(pending.receipt, { friend_id: 1, target_pvid: 2 });
assert.deepEqual(socialFriendList(pending.next, 1, "4", profile).list.map((r) => r.type), ["request"]);
assert.deepEqual(socialFriendList(pending.next, 2, 3, profile).list.map((r) => r.type), ["received"]);
assert.deepEqual(socialFriendList(pending.next, 3, 3, profile), { list: [] });
assert.deepEqual(planSocialFriend(pending.next, 1, "request", 2, profile, () => false, 2000).next, pending.next);
assert.throws(() => planSocialFriend(pending.next, 1, "accept", 1, profile, () => false, 2000), /owned incoming/);
assert.throws(() => planSocialFriend(pending.next, 3, "accept", 1, profile, () => false, 2000), /owned incoming/);
assert.throws(() => planSocialFriend(pending.next, 2, "request", 1, profile, () => false, 2000), /must be accepted/);
const accepted = planSocialFriend(pending.next, 2, "accept", 1, profile, () => false, 2000);
assert.deepEqual(accepted.receipt, { friend_id: 1 });
assert.deepEqual(socialFriendList(accepted.next, 1, 1, profile).list.map((r) => r.target_pvid), [2]);
assert.deepEqual(socialFriendList(accepted.next, 2, 1, profile).list.map((r) => r.target_pvid), [1]);
assert.deepEqual(planSocialFriend(accepted.next, 2, "accept", 1, profile, () => false, 3000).next, accepted.next);
assert.throws(() => planSocialFriend(empty, 1, "request", 1, profile, () => false, 1000), /yourself/);
assert.throws(() => planSocialFriend(empty, 1, "request", 999, profile, () => false, 1000), /Unknown/);
assert.throws(() => planSocialFriend(empty, 1, "request", 2, profile, (a) => a === 2, 1000), /blocked/);
for (const bad of [0, -1, true, NaN, Infinity, 1.5, "01", "1.0", "1e0", {}, [], 2 ** 53])
  assert.throws(() => planSocialFriend(empty, 1, "request", bad, profile, () => false, 1000));
for (const bad of [{ next_id: 1, relations: pending.next.relations }, { next_id: 2, relations: [pending.next.relations[0], pending.next.relations[0]] }])
  assert.throws(() => normalizeSocialFriends(bad), /Malformed/);

const directory = mkdtempSync(path.join(tmpdir(), "blustone-social-friends-"));
const filename = path.join(directory, "state.json");
try {
  const state = new ServerState("http://localhost", filename);
  const a = state.registerGuest({ device_id: "friend-a", nickname: "A" }, {}).ret_data as any;
  const b = state.registerGuest({ device_id: "friend-b", nickname: "B" }, {}).ret_data as any;
  const c = state.registerGuest({ device_id: "friend-c", nickname: "C" }, {}).ret_data as any;
  // Finish setup's existing registration/energy-anchor writes before taking
  // the checkpoint; the lifecycle below must preserve this exact game state.
  (state as any).persist();
  // Inspect the existing test-only graph directly; gameFor intentionally
  // regenerates energy clocks and would itself change the comparison baseline.
  const game = (state as any).gameByPvid.get(a.pvid);
  const gameBefore = JSON.stringify(game);
  const call = (actor: any, name: string, extra = {}) => gameResponse(state, `/relation/${name}`, { ...actor, ...extra }) as any;
  const beforeRead = readFileSync(filename, "utf8");
  assert.deepEqual(call(a, "GetList", { type: 1 }).ret_data, { list: [] });
  assert.equal(call(a, "GetFriendReceivedCount").ret_data, 0);
  assert.equal(readFileSync(filename, "utf8"), beforeRead, "Legacy reads never add graph or alter private save bytes");
  assert.throws(() => call({}, "GetList", { type: 1 }), /authenticated account required/);
  assert.throws(() => call({ otp: a.otp, pvid: b.pvid }, "FriendRequest", { target_pvid: c.pvid }), /account|identity|PVID|pvid/i);
  assert.notEqual(call(a, "FriendRequest", { target_pvid: a.pvid }).result_code, 1);
  assert.notEqual(call(a, "FriendRequest", { target_pvid: 9000001 }).result_code, 1, "Arena fixture identity is not a real local friend");
  const request = call(a, "FriendRequest", { target_pvid: String(b.pvid) });
  assert.equal(request.result_code, 1);
  assert.deepEqual(request.ret_data, { friend_id: 1, target_pvid: b.pvid });
  const pendingBytes = readFileSync(filename, "utf8");
  assert.deepEqual(call(a, "FriendRequest", { target_pvid: b.pvid }).ret_data, request.ret_data);
  assert.equal(readFileSync(filename, "utf8"), pendingBytes, "Pending replay preserves allocator and bytes");
  const received = call(b, "GetList", { type: 3 }).ret_data.list;
  assert.equal(received.length, 1);
  assert.equal(received[0].target_pvid, a.pvid);
  assert.equal(received[0].nick_name, "A");
  assert.equal(received[0].type, "received");
  assert.equal(received[0].tick, 0, "Unknown native tick semantics never reuse a login clock");
  assert.equal(received[0].received_dtm, 0, "Internal creation clock is not an original received_dtm");
  const peerProfile = call(b, "GetTargetUserInfo", { list: `[${a.pvid}]` });
  assert.equal(peerProfile.result_code, 1);
  assert.equal(peerProfile.ret_data.list[0].pvid, a.pvid);
  assert.equal(peerProfile.ret_data.list[0].nick_name, "A");
  assert.equal(peerProfile.ret_data.list[0].profile_url, "http://localhost/local-profile/replica-100.png");
  assert.notEqual(call(b, "GetTargetUserInfo", { list: `[${c.pvid}]` }).result_code, 1, "Unrelated local accounts are not authorized social profiles");
  assert.equal(call(b, "GetFriendReceivedCount").ret_data, 1);
  assert.deepEqual(call(c, "GetList", { type: 3 }).ret_data, { list: [] });
  assert.notEqual(call(c, "FriendReqAccept", { target_friend_id: 1 }).result_code, 1);
  assert.equal(readFileSync(filename, "utf8"), pendingBytes);
  const restarted = new ServerState("http://localhost", filename);
  assert.deepEqual((gameResponse(restarted, "/relation/GetList", { ...b, type: 3 }) as any).ret_data.list, received);
  mkdirSync(`${filename}.tmp`);
  assert.notEqual((gameResponse(restarted, "/relation/FriendReqAccept", { ...b, target_friend_id: 1 }) as any).result_code, 1);
  assert.equal((gameResponse(restarted, "/relation/GetFriendReceivedCount", b) as any).ret_data, 1, "Failed accept restores both perspectives");
  assert.equal(readFileSync(filename, "utf8"), pendingBytes);
  rmSync(`${filename}.tmp`, { recursive: true });
  assert.deepEqual((gameResponse(restarted, "/relation/FriendReqAccept", { ...b, target_friend_id: 1 }) as any).ret_data, { friend_id: 1 });
  const acceptedBytes = readFileSync(filename, "utf8");
  assert.deepEqual((gameResponse(restarted, "/relation/FriendReqAccept", { ...b, target_friend_id: 1 }) as any).ret_data, { friend_id: 1 });
  assert.equal(readFileSync(filename, "utf8"), acceptedBytes);
  assert.equal((gameResponse(restarted, "/relation/GetFriendReceivedCount", b) as any).ret_data, 0);
  assert.equal((gameResponse(restarted, "/relation/GetList", { ...a, type: 1 }) as any).ret_data.list[0].target_pvid, b.pvid);
  assert.equal((gameResponse(restarted, "/relation/GetList", { ...b, type: 1 }) as any).ret_data.list[0].target_pvid, a.pvid);
  assert.deepEqual(JSON.parse(acceptedBytes).gameStates, JSON.parse(beforeRead).gameStates,
    "Social lifecycle preserves persisted game/wallet/cards/decks/progress, including clocks");
  assert.equal(JSON.stringify(game), gameBefore, "Original in-memory game is untouched");
  assert.equal((gameResponse(restarted, "/relation/Block", { ...c, target_list: `[${a.pvid}]` }) as any).result_code, 1);
  const blockedBytes = readFileSync(filename, "utf8");
  assert.notEqual((gameResponse(restarted, "/relation/FriendRequest", { ...a, target_pvid: c.pvid }) as any).result_code, 1);
  assert.equal(readFileSync(filename, "utf8"), blockedBytes, "Either-direction block prevents requests without writes");
  const corrupted = JSON.parse(blockedBytes);
  corrupted.socialFriends.relations[0].to_pvid = 999999;
  const corruptBytes = JSON.stringify(corrupted);
  writeFileSync(filename, corruptBytes);
  assert.throws(() => new ServerState("http://localhost", filename), /unknown|Unknown/);
  assert.equal(readFileSync(filename, "utf8"), corruptBytes);
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log("Local friends: exact native wrapper/types/receipts, reciprocal ownership, authenticated lifecycle, blocked admission, persistence/replay/rollback and unrelated-save preservation passed; native UI remains unverified.");
