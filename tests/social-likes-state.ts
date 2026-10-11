import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-social-likes-"));
const filename = path.join(directory, "state.json");
try {
  const state = new ServerState("http://localhost", filename);
  const [a, b, c, d] = ["A", "B", "C", "Different Server"].map((nickname) =>
    state.registerGuest({ device_id: `likes-${nickname}`, nickname }, {}).ret_data as any);
  (state as any).accountsByPvid.get(d.pvid).serverId = 2;
  (state as any).persist();
  const original = readFileSync(filename, "utf8");
  const gamesBefore = JSON.parse(original).gameStates;
  const call = (server: ServerState, actor: any, route: string, extra = {}) => gameResponse(server, `/relation/${route}`, { ...actor, ...extra }) as any;
  const brief = (server: ServerState, actor: any, peer: any) => call(server, actor, "GetTargetUserInfo", { list: `[${peer.pvid}]` }).ret_data.list[0];
  assert.equal(JSON.parse(original).socialLikes, undefined);
  assert.deepEqual(call(state, a, "GetLikeCnt", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, cnt: 0 });
  assert.equal(brief(state, a, b).like_cnt, 0);
  assert.equal(readFileSync(filename, "utf8"), original, "Legacy reads preserve exact bytes and omit empty like graph");
  assert.throws(() => call(state, {}, "ToggleLike", { target_pvid: b.pvid }), /authenticated account required/);
  assert.throws(() => call(state, { otp: a.otp, pvid: c.pvid }, "ToggleLike", { target_pvid: b.pvid }), /account|identity|PVID|pvid/i);
  for (const target_pvid of [a.pvid, d.pvid, 99999999, 9000001, 1])
    assert.notEqual(call(state, a, "ToggleLike", { target_pvid }).result_code, 1);
  assert.notEqual(call(state, a, "GetLikeCnt", { target_pvid: d.pvid }).result_code, 1);
  assert.equal(readFileSync(filename, "utf8"), original);
  mkdirSync(`${filename}.tmp`);
  assert.notEqual(call(state, a, "ToggleLike", { target_pvid: b.pvid }).result_code, 1);
  assert.deepEqual(call(state, a, "GetLikeCnt", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, cnt: 0 });
  assert.equal(brief(state, a, b).is_like, 0);
  assert.equal((state as any).socialLikes, undefined, "Failed first write restores missing-field legacy state");
  assert.equal(readFileSync(filename, "utf8"), original);
  rmSync(`${filename}.tmp`, { recursive: true });
  assert.deepEqual(call(state, a, "ToggleLike", { target_pvid: String(b.pvid) }).ret_data, { target_pvid: b.pvid, is_like: 1 });
  assert.deepEqual(call(state, c, "ToggleLike", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, is_like: 1 });
  assert.deepEqual(call(state, a, "GetLikeCnt", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, cnt: 2 });
  assert.equal(brief(state, a, b).like_cnt, 2);
  assert.equal(brief(state, a, b).is_like, 1);
  assert.equal(brief(state, b, b).like_cnt, 2, "Own public profile uses actual received total");
  assert.equal(brief(state, b, b).is_like, 0);
  const suggested = call(state, a, "GetSuggestedFriendList", { start: 0, length: 10 }).ret_data.list.find((row: any) => row.target_pvid === b.pvid);
  assert.equal(suggested.like_cnt, 2);
  assert.equal(suggested.is_like, 1);
  const searched = call(state, a, "FriendSearch", { target_nick_name: "B", start: 0, end: 10 }).ret_data.list[0];
  assert.equal(searched.like_cnt, 2);
  assert.equal(searched.is_like, 1);
  const request = call(state, a, "FriendRequest", { target_pvid: b.pvid }).ret_data.friend_id;
  assert.equal(call(state, b, "FriendReqAccept", { target_friend_id: request }).result_code, 1);
  const friend = call(state, a, "GetList", { type: 1 }).ret_data.list[0];
  assert.equal(friend.like_cnt, 2);
  assert.equal(friend.is_like, 1);
  const after = readFileSync(filename, "utf8");
  const restarted = new ServerState("http://localhost", filename);
  assert.deepEqual(call(restarted, a, "GetLikeCnt", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, cnt: 2 });
  assert.equal(brief(restarted, a, b).is_like, 1);
  assert.equal(readFileSync(filename, "utf8"), after, "Restart/read does not rewrite graph");
  mkdirSync(`${filename}.tmp`);
  assert.notEqual(call(restarted, a, "ToggleLike", { target_pvid: b.pvid }).result_code, 1);
  assert.equal(brief(restarted, a, b).like_cnt, 2, "Failed unlike restores aggregate");
  assert.equal(brief(restarted, a, b).is_like, 1, "Failed unlike restores caller's edge");
  assert.equal(readFileSync(filename, "utf8"), after);
  rmSync(`${filename}.tmp`, { recursive: true });
  assert.deepEqual(call(restarted, a, "ToggleLike", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, is_like: 0 });
  assert.equal(brief(restarted, a, b).like_cnt, 1);
  assert.equal(brief(restarted, c, b).is_like, 1, "Unlike preserves a different actor's edge");
  assert.equal(call(restarted, a, "Block", { target_list: `[${b.pvid}]` }).result_code, 1);
  const blocked = readFileSync(filename, "utf8");
  assert.notEqual(call(restarted, a, "ToggleLike", { target_pvid: b.pvid }).result_code, 1);
  assert.notEqual(call(restarted, b, "ToggleLike", { target_pvid: a.pvid }).result_code, 1);
  assert.notEqual(call(restarted, a, "GetLikeCnt", { target_pvid: b.pvid }).result_code, 1);
  assert.deepEqual(call(restarted, b, "GetLikeCnt", { target_pvid: b.pvid }).ret_data, { target_pvid: b.pvid, cnt: 1 });
  assert.equal(readFileSync(filename, "utf8"), blocked);
  assert.deepEqual(JSON.parse(blocked).gameStates, gamesBefore);
  for (const edges of [[{ from_pvid: a.pvid, to_pvid: 99999999 }], [{ from_pvid: a.pvid, to_pvid: d.pvid }],
    [{ from_pvid: a.pvid, to_pvid: a.pvid }], [{ from_pvid: a.pvid, to_pvid: b.pvid }, { from_pvid: a.pvid, to_pvid: b.pvid }]]) {
    const invalid = JSON.parse(blocked);
    invalid.socialLikes = { edges };
    const bytes = JSON.stringify(invalid);
    writeFileSync(filename, bytes);
    assert.throws(() => new ServerState("http://localhost", filename), /unknown|different-server|Malformed/i);
    assert.equal(readFileSync(filename, "utf8"), bytes, "Malformed social source bytes remain available for recovery");
  }
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log("Routed likes: native receipts, real directed ownership, profile/list/discovery/self coherence, authentication/scope, legacy bytes, restart, whole-graph rollback and exact unrelated game preservation passed; native UI remains unverified.");
