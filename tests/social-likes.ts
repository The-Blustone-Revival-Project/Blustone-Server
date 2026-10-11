import assert from "node:assert/strict";
import { emptySocialLikes, normalizeSocialLikes, planSocialLikeToggle, readSocialLikeCount, socialLikeProjection } from "../src/social-likes.js";

const profiles = [1, 2, 3, 4].map((pvid) => ({ pvid, nickname: `Local ${pvid}`, serverId: pvid === 4 ? 2 : 1,
  beginUtc: 0, lastLoginAt: 0, profile_url: "" }));
const context = { profile: (id: number) => profiles.find((row) => row.pvid === id), blocked: () => false };
const empty = emptySocialLikes();
const first = planSocialLikeToggle(empty, 1, "2", context);
assert.deepEqual(first.receipt, { target_pvid: 2, is_like: 1 });
assert.deepEqual(first.projection, { like_cnt: 1, is_like: 1 });
assert.deepEqual(empty, emptySocialLikes(), "Planning cannot change original state");
assert.deepEqual(readSocialLikeCount(first.next, 2, 2, context), { target_pvid: 2, cnt: 1 }, "Own received count is readable without liking self");
assert.deepEqual(socialLikeProjection(first.next, 3, 2), { like_cnt: 1, is_like: 0 }, "Only viewer's own edge affects is_like");
const second = planSocialLikeToggle(first.next, 3, 2, context);
assert.deepEqual(readSocialLikeCount(second.next, 1, 2, context), { target_pvid: 2, cnt: 2 });
const removed = planSocialLikeToggle(second.next, 1, 2, context);
assert.deepEqual(removed.receipt, { target_pvid: 2, is_like: 0 });
assert.deepEqual(removed.projection, { like_cnt: 1, is_like: 0 });
assert.deepEqual(socialLikeProjection(removed.next, 3, 2), { like_cnt: 1, is_like: 1 }, "Unliking cannot remove another actor's edge");
assert.deepEqual(planSocialLikeToggle(first.next, 1, 2, context).next, empty,
  "Repeating the native scalar-only toggle inverses it; never claim idempotency");
const persisted = normalizeSocialLikes(JSON.parse(JSON.stringify(second.next)), context.profile);
assert.deepEqual(readSocialLikeCount(persisted, 1, 2, context), { target_pvid: 2, cnt: 2 });
assert.equal("cnt" in first.receipt, false, "Toggle and count receipts are different native contracts");
assert.equal("item" in first.receipt, false);
assert.equal("user" in first.receipt, false, "A like never creates an economy or reward receipt");
for (const bad of [0, -1, 1.5, true, "02", "2.0", {}, [], Number.MAX_SAFE_INTEGER + 1])
  assert.throws(() => planSocialLikeToggle(empty, 1, bad, context));
assert.throws(() => planSocialLikeToggle(empty, 1, 1, context), /yourself/);
assert.throws(() => planSocialLikeToggle(empty, 1, 4, context), /different-server/);
assert.throws(() => planSocialLikeToggle(empty, 1, 999, context), /Unknown/);
for (const blocked of [(a: number, b: number) => a === 1 && b === 2, (a: number, b: number) => a === 2 && b === 1]) {
  assert.throws(() => planSocialLikeToggle(first.next, 1, 2, { ...context, blocked }), /blocked/);
  assert.throws(() => readSocialLikeCount(first.next, 1, 2, { ...context, blocked }), /blocked/);
}
for (const invalid of [{ edges: [{ from_pvid: 1, to_pvid: 1 }] },
  { edges: [{ from_pvid: "1", to_pvid: 2 }] }, { edges: [{ from_pvid: 1, to_pvid: 2 }, { from_pvid: 1, to_pvid: 2 }] }])
  assert.throws(() => normalizeSocialLikes(invalid), /Malformed/);
assert.throws(() => normalizeSocialLikes({ edges: [{ from_pvid: 1, to_pvid: 999 }] }, context.profile), /unknown/);
assert.throws(() => normalizeSocialLikes({ edges: [{ from_pvid: 1, to_pvid: 4 }] }, context.profile), /different-server/);
assert.deepEqual(first.next, { edges: [{ from_pvid: 1, to_pvid: 2 }] }, "All failure/read branches preserve the existing graph");
console.log("Local likes planner: exact count/toggle receipts, directed ownership, distinct-actor totals, native non-idempotent toggle semantics, scope/block validation and immutable planning passed; native device validation remains pending.");
