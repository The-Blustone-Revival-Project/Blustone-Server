/** Native list rows use named type strings; selector enums are friend1,
 * candidate2, received3, request4. Relationship ownership/selection/limits and
 * clocks below are explicit local-account policy, not original server data. */
export interface LocalFriendRelation {
  friend_id: number;
  from_pvid: number;
  to_pvid: number;
  state: "pending" | "accepted" | "cancelled" | "rejected" | "removed";
  created_at: number;
}
export interface SocialFriends { next_id: number; relations: LocalFriendRelation[] }
export interface FriendProfile {
  pvid: number; nickname: string; serverId: number; beginUtc: number; lastLoginAt: number;
  profile_url: string;
}
export const emptySocialFriends = (): SocialFriends => ({ next_id: 1, relations: [] });

export function socialFriendId(raw: unknown): number {
  if (typeof raw === "string" && /^(0|[1-9][0-9]*)$/.test(raw)) raw = Number(raw);
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw <= 0)
    throw new TypeError("Social identity must be a positive safe integer");
  return raw;
}

export function normalizeSocialFriends(raw: unknown): SocialFriends {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Malformed local friends graph");
  const value = raw as SocialFriends;
  if (typeof value.next_id !== "number") throw new TypeError("Malformed local friends graph");
  const next_id = socialFriendId(value.next_id);
  if (!Array.isArray(value.relations)) throw new TypeError("Malformed local friends graph");
  const ids = new Set<number>(), pairs = new Set<string>();
  const relations = value.relations.map((row) => {
    if (!row || typeof row !== "object") throw new TypeError("Malformed local friend relation");
    if ([row.friend_id, row.from_pvid, row.to_pvid].some((id) => typeof id !== "number"))
      throw new TypeError("Malformed local friend relation");
    const friend_id = socialFriendId(row.friend_id), from_pvid = socialFriendId(row.from_pvid), to_pvid = socialFriendId(row.to_pvid);
    const pair = [from_pvid, to_pvid].sort((a, b) => a - b).join(":");
    const active = row.state === "pending" || row.state === "accepted";
    if (from_pvid === to_pvid || friend_id >= next_id || ids.has(friend_id) || (active && pairs.has(pair)) ||
        !["pending", "accepted", "cancelled", "rejected", "removed"].includes(row.state) || !Number.isSafeInteger(row.created_at) || row.created_at < 0)
      throw new TypeError("Malformed local friend relation");
    ids.add(friend_id); if (active) pairs.add(pair);
    return { friend_id, from_pvid, to_pvid, state: row.state, created_at: row.created_at };
  });
  return { next_id, relations };
}

function sameLocalServer(actor: number, target: number, profile: (id: number) => FriendProfile | undefined) {
  const self = profile(actor), peer = profile(target);
  if (!self || !peer || self.pvid !== actor || peer.pvid !== target || self.serverId !== peer.serverId)
    throw new Error("Unknown or different-server local account");
  return peer;
}

/** Pure whole-graph transition; caller persists once and rolls back on failure.
 * Request replay of an existing same-direction pending relation and recipient
 * accept replay are idempotent local policy. Reverse requests never auto-accept.
 */
export function planSocialFriend(current: SocialFriends, actor: number, action: "request" | "accept", rawId: unknown,
  profile: (id: number) => FriendProfile | undefined, blocked: (a: number, b: number) => boolean, now: number) {
  const next = normalizeSocialFriends(current);
  socialFriendId(actor);
  const id = socialFriendId(rawId);
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("Invalid local relation clock");
  if (action === "request") {
    if (id === actor) throw new Error("Cannot request yourself as a friend");
    sameLocalServer(actor, id, profile);
    if (blocked(actor, id) || blocked(id, actor)) throw new Error("Friend request is blocked");
    const existing = next.relations.find((row) => (row.state === "pending" || row.state === "accepted") &&
      ((row.from_pvid === actor && row.to_pvid === id) || (row.from_pvid === id && row.to_pvid === actor)));
    if (existing) {
      if (existing.state === "pending" && existing.from_pvid === actor)
        return { next, receipt: { friend_id: existing.friend_id, target_pvid: id } };
      throw new Error(existing.state === "accepted" ? "Accounts are already friends" : "Incoming friend request must be accepted");
    }
    if (next.next_id >= Number.MAX_SAFE_INTEGER) throw new Error("Local friend identity space exhausted");
    const friend_id = next.next_id++;
    next.relations.push({ friend_id, from_pvid: actor, to_pvid: id, state: "pending", created_at: now });
    return { next, receipt: { friend_id, target_pvid: id } };
  }
  const relation = next.relations.find((row) => row.friend_id === id);
  if (!relation || relation.to_pvid !== actor || !["pending", "accepted"].includes(relation.state))
    throw new Error("No owned incoming friend request");
  sameLocalServer(actor, relation.from_pvid, profile);
  if (blocked(actor, relation.from_pvid) || blocked(relation.from_pvid, actor)) throw new Error("Friend acceptance is blocked");
  relation.state = "accepted";
  return { next, receipt: { friend_id: relation.friend_id } };
}

/** Cancel/reject/unfriend use target_friend_id_list JSON numeric arrays, NOT
 * account PVIDs or comma-separated text. All callbacks consume friend_id_list.
 */
export function socialFriendIdList(raw: unknown): number[] {
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { throw new TypeError("Friend IDs must be a JSON numeric array"); }
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.some((id) => typeof id !== "number"))
    throw new TypeError("Friend IDs must be a nonempty numeric array");
  return [...new Set(raw.map(socialFriendId))];
}

/** Validate every participant/state before changing a cloned graph. Tombstones
 * retain original ownership and monotone IDs for restart-safe retry receipts.
 * Historical row retention/idempotent cleanup is explicit local server policy.
 */
export function planSocialFriendRemoval(current: SocialFriends, actor: number, action: "cancel" | "reject" | "unfriend",
  rawIds: unknown, profile: (id: number) => FriendProfile | undefined) {
  const next = normalizeSocialFriends(current);
  socialFriendId(actor);
  const ids = socialFriendIdList(rawIds);
  const finalState = action === "cancel" ? "cancelled" : action === "reject" ? "rejected" : "removed";
  const rows = ids.map((id) => {
    const row = next.relations.find((relation) => relation.friend_id === id);
    if (!row || (action === "cancel" ? row.from_pvid !== actor : action === "reject" ? row.to_pvid !== actor :
      row.from_pvid !== actor && row.to_pvid !== actor)) throw new Error("No owned friend relationship for this operation");
    sameLocalServer(actor, row.from_pvid === actor ? row.to_pvid : row.from_pvid, profile);
    if (row.state !== finalState && row.state !== (action === "unfriend" ? "accepted" : "pending"))
      throw new Error("Friend relationship is not in the required lifecycle state");
    return row;
  });
  for (const row of rows) row.state = finalState;
  return { next, receipt: { friend_id_list: ids } };
}

export function socialFriendList(current: SocialFriends, actor: number, rawType: unknown,
  profile: (id: number) => FriendProfile | undefined) {
  const type = socialFriendId(rawType);
  if (![1, 2, 3, 4].includes(type)) throw new Error("Unsupported native friend-list selector");
  const graph = normalizeSocialFriends(current);
  if (!profile(actor)) throw new Error("Unknown authenticated local account");
  const list = graph.relations.filter((row) => type === 1 ? row.state === "accepted" &&
    (row.from_pvid === actor || row.to_pvid === actor) : row.state === "pending" &&
    (type === 3 ? row.to_pvid === actor : type === 4 ? row.from_pvid === actor : false))
    .map((row) => {
      const target_pvid = row.from_pvid === actor ? row.to_pvid : row.from_pvid;
      const peer = sameLocalServer(actor, target_pvid, profile);
      // Name/registration is the local account profile. Tick/received_dtm
      // semantics remain unproved: emit neutral0, not a guessed login/cooldown
      // timestamp. Internal created_at is never presented as an original clock.
      return { friend_id: row.friend_id, target_pvid, type: type === 1 ? "friend" : type === 3 ? "received" : "request",
        reg_utc: peer.beginUtc, tick: 0, received_dtm: 0,
        nick_name: peer.nickname, country_code: "", profile_url: peer.profile_url, profile_status: "", like_cnt: 0, is_like: 0 };
    }).sort((a, b) => a.friend_id - b.friend_id);
  return { list };
}

/** ReqReceivedFriendCountCB G81dc8c reads ret_data itself as a uint32 scalar. */
export function receivedSocialFriendCount(current: SocialFriends, actor: number) {
  socialFriendId(actor);
  return normalizeSocialFriends(current).relations.filter((row) => row.state === "pending" && row.to_pvid === actor).length;
}
