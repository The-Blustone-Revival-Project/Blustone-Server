/** Native GetInfo DTOs: G9359ac, Parse_InstBase G933d80, ParseHeroInfo G9347f8.
 * This is a read-only initial lobby, not a reconstructed Mirage run.
 * Original weekly rotations/stairs/rewards are absent. Empty collections do
 * not substitute texture IDs or grant hunters. UTC weeks are replica policy.
 */
const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 7 * DAY_SECONDS;
// The first Monday after the Unix epoch Thursday is four days later.
const MONDAY_OFFSET = 4 * DAY_SECONDS;

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
