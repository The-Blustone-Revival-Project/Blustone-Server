/** Native 28D login-bonus seam, distinct from legacy AttendReward.
 * LOCAL: bounded 28 observed UTC login days, gold100 each, no catch-up/cycle.
 * Original reward tables/timezone/cycle policy are missing. */
export const LOGIN_BONUS_DAYS = 28;
export const LOGIN_BONUS_GOLD = 100;
// Original RequestLoginReward Gf49624/f49626 captures SRREWARD_INFO VIP delta20.
// GetItemThumbList Gafa5d2 renders it as VIP1; it is EXP, not an item stack.
export const LOGIN_BONUS_VIP_EXP = 20;
export interface LoginBonusState { last_visit_day: number; eligible: number; claimed: number[] }
export const emptyLoginBonus = (): LoginBonusState => ({ last_visit_day: -1, eligible: 0, claimed: [] });
export function normalizeLoginBonus(raw: unknown): LoginBonusState {
  if (raw === undefined) return emptyLoginBonus();
  const row = raw as LoginBonusState;
  if (!row || !Number.isSafeInteger(row.last_visit_day) || row.last_visit_day < -1 ||
      !Number.isSafeInteger(row.eligible) || row.eligible < 0 || row.eligible > LOGIN_BONUS_DAYS ||
      !Array.isArray(row.claimed) || new Set(row.claimed).size !== row.claimed.length ||
      row.claimed.some((day) => !Number.isSafeInteger(day) || day < 1 || day > row.eligible) ||
      (row.last_visit_day === -1) !== (row.eligible === 0)) throw new Error("Malformed login bonus state");
  return structuredClone(row);
}
export function loginBonusReference() {
  return Array.from({ length: LOGIN_BONUS_DAYS }, (_, index) => ({ target_cnt: index + 1,
    gold: LOGIN_BONUS_GOLD, free_iap: 0,
    // ParseLoginBonusRef performs from_json<string> then JSON::parse.
    item_list: "[]", card_list: "[]" }));
}
export function observeLoginBonus(state: LoginBonusState, now: number): boolean {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid login bonus clock");
  const day = Math.floor(now / 86_400_000);
  if (day <= state.last_visit_day) return false;
  state.last_visit_day = day;
  state.eligible = Math.min(LOGIN_BONUS_DAYS, state.eligible + 1);
  return true;
}
export const loginBonusInstance = (state: LoginBonusState) => ({ cur_value: state.eligible,
  cycle: 1, cycle_log: [...state.claimed] });
