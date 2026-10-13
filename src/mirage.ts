/** Native GetInfo DTOs: G9359ac, Parse_InstBase G933d80, ParseHeroInfo G9347f8.
 * This is a read-only initial lobby, not a reconstructed Mirage run.
 * Original weekly rotations/stairs/rewards are absent. Empty collections do
 * not substitute texture IDs or grant hunters. UTC weeks are replica policy.
 */
const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 7 * DAY_SECONDS;
// The first Monday after the Unix epoch Thursday is four days later.
const MONDAY_OFFSET = 4 * DAY_SECONDS;

/** End's native callback tests KEY EXISTENCE after its failure/retry path,
 * then parses cached HP/state even on non1. Null is not a neutral data body.
 * Omission skips cache writes. Its caller additionally checks actual result
 * code before success UI; this is not a successful or reconstructed End. */
export function mirageEndRefusal(code=2001,message="Mirage End settlement is not reconstructed"):Record<string,unknown> {
  return {result_code:code,protocol_code:0,code,error:message};
}

/** RequestFriend callback G938298 passes ret_data directly to ParseFriendInfo
 * G934c00. Each row groups nicknames by a floor; it does not carry account IDs.
 * Callers must supply ONLY established friend relationships, never all local
 * accounts or invented rivals. The replica currently has no such relationships.
 */
export function mirageFriendFloors(friends: readonly { nickname: string; highestFloor: number }[] = []) {
  const floors = new Map<number, string[]>();
  for (const friend of friends) {
    if (!Number.isInteger(friend.highestFloor) || friend.highestFloor < 0 || friend.highestFloor > 0x7fff_ffff)
      throw new RangeError("Mirage friend floor exceeds the native signed 32-bit range");
    if (typeof friend.nickname !== "string" || friend.nickname.length === 0)
      throw new TypeError("Mirage friend nickname must be a nonempty string");
    const names = floors.get(friend.highestFloor) ?? [];
    // Distinct friends can share a nickname; retain both rather than use it as
    // a substitute account identifier.
    names.push(friend.nickname);
    floors.set(friend.highestFloor, names);
  }
  // Ordering is replica presentation policy; the original ranking order is
  // unrecovered. Floors are not assigned or granted by this read-only DTO.
  return [...floors].sort(([a], [b]) => b - a).map(([floor, nick_list]) => ({ floor, nick_list }));
}

export function mirageLobby(nowMs = Date.now()) {
  const now = Math.floor(nowMs / 1000);
  if (!Number.isSafeInteger(now) || now < 0 || now > 0x7fff_ffff - WEEK_SECONDS)
    throw new RangeError("Mirage clock exceeds the native signed 32-bit range");
  const weekStart = Math.floor((now - MONDAY_OFFSET) / WEEK_SECONDS) * WEEK_SECONDS + MONDAY_OFFSET;
  return {
    // No entered hunters or active saved deck in the unreconstructed mode.
    entry: [],
    inst_base: {
      bg_res: "", dlg_begin: "", dlg_end: "", new_record: 0,
      floor: 0, stair: 0, state: 0, deck: [], tier_percent: 0,
      highest: 0, revive_price: 0, begin_ltime: 0,
    },
    inst_enemy: [],
    ref_stair: { res_prefix: "", res_postfix_list: [], list: [] },
    // RetryInfo.SetData compares this time with synchronized local seconds.
    ref_hero: { bonus: 0, end_ltime: weekStart + WEEK_SECONDS, cur: [], next: [] },
  };
}
