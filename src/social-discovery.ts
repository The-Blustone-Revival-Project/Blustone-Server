import { normalizeSocialFriends, socialFriendId, type FriendProfile, type SocialFriends } from "./social-friends.js";

/** Server policy, not recovered original quotas. Native game manager defaults
 * to a ten-row first page; the exact SDK accepts uint32 paging parameters. */
export const LOCAL_SOCIAL_DISCOVERY_MAX_PAGE = 50;
export const LOCAL_SOCIAL_SEARCH_MAX_QUERY = 64;

function uint32(raw: unknown, field: string): number {
  if (typeof raw === "string" && /^(0|[1-9][0-9]*)$/.test(raw)) raw = Number(raw);
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw < 0 || raw > 0xffffffff)
    throw new TypeError(`Invalid social discovery ${field}`);
  return raw;
}

/** Both callbacks read ret_data.{start,length,list}. Suggested requests use
 * start,length; Search requests use target_nick_name,start,end. Search's end is
 * interpreted as an exclusive bound by LOCAL policy, not proven server logic.
 * Candidate friend_id0 is an explicit no-relationship sentinel: native
 * GetFriendInfo accepts/stores zero, but no original candidate row is recovered.
 * Nothing allocates a relationship or changes the private social graph.
 */
export function socialDiscovery(current: SocialFriends, actor: number, mode: "suggested" | "search",
  payload: Record<string, unknown>, profiles: readonly FriendProfile[], blocked: (a: number, b: number) => boolean) {
  socialFriendId(actor);
  const graph = normalizeSocialFriends(current);
  const ids = new Set<number>();
  for (const peer of profiles) {
    socialFriendId(peer.pvid);
    if (ids.has(peer.pvid)) throw new Error("Duplicate local account identity");
    ids.add(peer.pvid);
  }
  const self = profiles.find((peer) => peer.pvid === actor);
  if (!self) throw new Error("Unknown authenticated local account");
  const start = uint32(payload.start, "start");
  const count = mode === "suggested" ? uint32(payload.length, "length") : uint32(payload.end, "end") - start;
  if (count < 0 || count > LOCAL_SOCIAL_DISCOVERY_MAX_PAGE || start + count > 0xffffffff)
    throw new Error("Social discovery page exceeds local limits");
  let query = "";
  if (mode === "search") {
    const raw = payload.target_nick_name;
    if (typeof raw !== "string" || !raw.trim() || [...raw.trim()].length > LOCAL_SOCIAL_SEARCH_MAX_QUERY || /[\u0000-\u001f\u007f-\u009f]/.test(raw))
      throw new TypeError("A bounded target_nick_name search is required");
    query = raw.trim().normalize("NFKC").toLowerCase();
  }
  const involved = new Set(graph.relations.filter((row) => row.state === "pending" || row.state === "accepted")
    .flatMap((row) => row.from_pvid === actor ? [row.to_pvid] : row.to_pvid === actor ? [row.from_pvid] : []));
  const peers = profiles.filter((peer) => peer.pvid !== actor && peer.serverId === self.serverId && !involved.has(peer.pvid) &&
    !blocked(actor, peer.pvid) && !blocked(peer.pvid, actor) &&
    (mode !== "search" || peer.nickname.normalize("NFKC").toLowerCase().includes(query)))
    .sort((a, b) => a.pvid - b.pvid).slice(start, start + count);
  const list = peers.map((peer) => ({ friend_id: 0, target_pvid: peer.pvid, type: "candidate",
    reg_utc: peer.beginUtc, tick: 0, received_dtm: 0, nick_name: peer.nickname, country_code: "",
    profile_url: peer.profile_url, profile_status: "", like_cnt: peer.like_cnt ?? 0, is_like: peer.is_like ?? 0 }));
  return { start, length: list.length, list };
}
