/** AP-only revival Supply. Native shapes/statuses are recovered; its id,
 * quantity and UTC daily schedule are local fixtures, not original balance.
 * Evidence: supply-refresh-contract.md; ghidra-supply-fuel-ui.txt. */
import { emptyLoginBonus, loginBonusInstance, loginBonusReference, type LoginBonusState } from "./login-bonus.js";
export const FIXTURE_FUEL_ID = "local_fuel_0";
export const FIXTURE_FUEL_AP = 10;
const DAY_MS = 86_400_000;

export function fuelCycle(now: number) {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid Supply clock");
  const day = Math.floor(now / DAY_MS);
  return { day, refreshUtc: (day + 1) * DAY_MS / 1000 };
}

/** 0=unavailable,1=claimable,2=received in native fuel UI. Future persisted
 * claims remain received after clock rollback; do not reopen a paid cycle. */
export function fuelStatus(lastClaimDay: number, now: number): 1 | 2 {
  return lastClaimDay >= fuelCycle(now).day ? 2 : 1;
}

export function supplyReference() {
  return {
    attend: [], attend_progress: [], attend_newbie: [], login_bonus: loginBonusReference(),
    activity: [{ id: FIXTURE_FUEL_ID, start_time: "00:00", end_time: "23:59",
      ap: FIXTURE_FUEL_AP, gold: 0, group_exp: 0, item_list: [], card_list: [] }],
  };
}

export function supplyActivities(lastClaimDay: number, now: number) {
  return { activity: [{ id: FIXTURE_FUEL_ID, status: fuelStatus(lastClaimDay, now) }],
    activity_refresh_utc: fuelCycle(now).refreshUtc };
}

/** ParseSupplyInfo's attendance parent is an object, unlike reference arrays.
 * Omit it so the explicit native null guard skips unreconstructed attendance. */
export function supplyInstances(lastClaimDay: number, now: number, bonus: LoginBonusState = emptyLoginBonus()) {
  return { ...supplyActivities(lastClaimDay, now),
    login_bonus: loginBonusInstance(bonus) };
}
