import { socialFriendId, type FriendProfile } from "./social-friends.js";

/** Directed likes are local interaction state, not original production totals.
 * No daily quota, cooldown, friendship requirement or reward is recovered.
 */
export interface SocialLike { from_pvid: number; to_pvid: number }
export interface SocialLikes { edges: SocialLike[] }
export interface SocialLikeContext {
  profile: (id: number) => FriendProfile | undefined;
  blocked: (actor: number, target: number) => boolean;
}
export const emptySocialLikes = (): SocialLikes => ({ edges: [] });

export function normalizeSocialLikes(raw: unknown, profile?: SocialLikeContext["profile"]): SocialLikes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray((raw as SocialLikes).edges))
    throw new TypeError("Malformed local like graph");
  const pairs = new Set<string>();
  const edges = (raw as SocialLikes).edges.map((row) => {
    if (!row || typeof row !== "object" || typeof row.from_pvid !== "number" || typeof row.to_pvid !== "number")
      throw new TypeError("Malformed local like ownership");
    const from_pvid = socialFriendId(row.from_pvid), to_pvid = socialFriendId(row.to_pvid);
    const key = `${from_pvid}:${to_pvid}`;
    if (from_pvid === to_pvid || pairs.has(key)) throw new TypeError("Malformed duplicate/self local like");
    if (profile) {
      const from = profile(from_pvid), to = profile(to_pvid);
      if (!from || !to || from.pvid !== from_pvid || to.pvid !== to_pvid || from.serverId !== to.serverId)
        throw new Error("Like graph references unknown or different-server local accounts");
    }
    pairs.add(key);
    return { from_pvid, to_pvid };
  }).sort((a, b) => a.from_pvid - b.from_pvid || a.to_pvid - b.to_pvid);
  return { edges };
}

function scopedTarget(actor: number, rawTarget: unknown, context: SocialLikeContext, allowSelf: boolean) {
  socialFriendId(actor);
  const target = socialFriendId(rawTarget);
  const from = context.profile(actor), to = context.profile(target);
  if (!from || !to || from.pvid !== actor || to.pvid !== target || from.serverId !== to.serverId)
    throw new Error("Unknown or different-server local like target");
  if (actor === target && !allowSelf) throw new Error("Cannot like yourself");
  if (actor !== target && (context.blocked(actor, target) || context.blocked(target, actor)))
    throw new Error("Local like interaction is blocked");
  return target;
}

/** Shared public metadata projection for friend/discovery/brief profile DTOs.
 * Caller must validate persisted graph participants when restoring it. This
 * projection never exposes a third party's directed edges or creates a like.
 */
export function socialLikeProjection(current: SocialLikes, viewer: number, target: number) {
  socialFriendId(viewer); socialFriendId(target);
  const graph = normalizeSocialLikes(current);
  const like_cnt = graph.edges.filter((row) => row.to_pvid === target).length;
  if (like_cnt > 0xffffffff) throw new Error("Local like count exceeds native uint32");
  return { like_cnt, is_like: graph.edges.some((row) => row.from_pvid === viewer && row.to_pvid === target) ? 1 : 0 };
}

/** ReqLikeCntCB reads ret_data.target_pvid:uint64 and cnt:uint32. */
export function readSocialLikeCount(current: SocialLikes, actor: number, rawTarget: unknown, context: SocialLikeContext) {
  const target_pvid = scopedTarget(actor, rawTarget, context, true);
  const checked = normalizeSocialLikes(current, context.profile);
  return { target_pvid, cnt: socialLikeProjection(checked, actor, target_pvid).like_cnt };
}

/** RequestToggleLike sends only target_pvid; its callback reads target_pvid and
 * is_like. Each accepted invocation toggles one owned directed edge. Repeating
 * the same request is a second toggle, NOT an idempotent retry. No original
 * intent/nonce is recovered, so this helper does not invent retry safety.
 * Caller atomically persists the returned clone and restores memory on failure.
 */
export function planSocialLikeToggle(current: SocialLikes, actor: number, rawTarget: unknown, context: SocialLikeContext) {
  const target_pvid = scopedTarget(actor, rawTarget, context, false);
  const next = normalizeSocialLikes(current, context.profile);
  const index = next.edges.findIndex((row) => row.from_pvid === actor && row.to_pvid === target_pvid);
  const is_like = index < 0 ? 1 : 0;
  if (index < 0) next.edges.push({ from_pvid: actor, to_pvid: target_pvid });
  else next.edges.splice(index, 1);
  next.edges.sort((a, b) => a.from_pvid - b.from_pvid || a.to_pvid - b.to_pvid);
  return { next, receipt: { target_pvid, is_like }, projection: socialLikeProjection(next, actor, target_pvid) };
}
