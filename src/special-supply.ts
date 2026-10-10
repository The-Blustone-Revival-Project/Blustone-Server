/** Recovered Special Supply transport, LOCAL gold-only first-clear bonus.
 * Original rewards/expiration policies are unknown. No retroactive grants. */
export const SPECIAL_CLEAR_GOLD = 10;
export interface SpecialSupplyRow { id: number; stage_id: string; gold: number; claimed: boolean }
export interface SpecialSupplyState { next_id: number; rows: SpecialSupplyRow[] }
export const emptySpecialSupply = (): SpecialSupplyState => ({ next_id: 1, rows: [] });
export function normalizeSpecialSupply(raw: unknown): SpecialSupplyState {
  if (raw === undefined) return emptySpecialSupply();
  const state = raw as SpecialSupplyState;
  if (!state || !Number.isSafeInteger(state.next_id) || state.next_id < 1 || state.next_id > 0xffffffff || !Array.isArray(state.rows) || state.rows.length > 100 ||
      state.rows.some((row) => !row || !Number.isSafeInteger(row.id) || row.id < 1 || row.id >= state.next_id ||
        typeof row.stage_id !== "string" || !/^n_\d+_\d+$/.test(row.stage_id) ||
        !Number.isSafeInteger(row.gold) || row.gold <= 0 || row.gold > 0xffffffff || typeof row.claimed !== "boolean") ||
      new Set(state.rows.map((row) => row.id)).size !== state.rows.length ||
      new Set(state.rows.map((row) => row.stage_id)).size !== state.rows.length)
    throw new Error("Malformed Special Supply state");
  return structuredClone(state);
}
export function earnSpecialSupply(state: SpecialSupplyState, stage: string) {
  if (state.rows.some((row) => row.stage_id === stage) || state.rows.length >= 100 || state.next_id >= 0xffffffff) return;
  state.rows.push({ id: state.next_id++, stage_id: stage, gold: SPECIAL_CLEAR_GOLD, claimed: false });
}
export function specialSupplyIds(raw: unknown): number[] | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const ids: unknown = JSON.parse(raw);
    return Array.isArray(ids) && ids.length > 0 && ids.length <= 100 &&
      ids.every((id) => Number.isSafeInteger(id) && id > 0) && new Set(ids).size === ids.length ? ids : null;
  } catch { return null; }
}
export function specialSupplyList(state: SpecialSupplyState) {
  return state.rows.filter((row) => !row.claimed).map((row) => ({ id: row.id,
    // PushList loads npc_id+'_TH'; C001_TH is served Lantern art.
    // Native expire_date==0 displays unlimited (9999 days).
    expire_date: 0, npc_id: "C001", title: `Local first-clear bonus: ${row.stage_id}`,
    gold: row.gold, ap: 0, bp: 0, honor: 0, free_iap: 0, iap: 0, user_exp: 0, vip_exp: 0,
    is_skin_duplicate: 0, str_id: "", str_param: "", item_list: [], card_list: [], gem_list: [], skin_list: [] }));
}
