/** Native AP/BP schemas are recovered; AP10/BP5, prices5Manda/100gold,
 * three purchases per resource shared across currencies per UTC day,
 * identities and thumbnails are explicit local fixtures. */
export const FUEL_SHOP_ID = "local_ap";
export const FUEL_SHOP_AP = 10;
export const FUEL_SHOP_LIMIT = 3;
export const FUEL_SHOP_PRICES = { 1: 5, 2: 100 } as const;
export const BP_SHOP_ID = "local_bp";
export const BP_SHOP_AMOUNT = 5;
export interface FuelShopState { day: number; manda: number; gold: number }
export function normalizeFuelShop(raw: unknown): FuelShopState {
  if (raw === undefined) return { day: -1, manda: 0, gold: 0 };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Malformed fuel purchase counters");
  const row = raw as FuelShopState;
  if (!Number.isSafeInteger(row.day) || row.day < -1 || !Number.isSafeInteger(row.manda) || row.manda < 0 ||
      !Number.isSafeInteger(row.gold) || row.gold < 0) throw new Error("Malformed fuel purchase counters");
  return { day: row.day, manda: row.manda, gold: row.gold };
}
export function settleFuelShop(state: FuelShopState, now: number): boolean {
  const day = Math.floor(now / 86_400_000);
  if (!Number.isSafeInteger(day) || day < 0) throw new Error("Invalid fuel shop clock");
  if (day <= state.day) return false; // rollback never reopens a paid cycle
  Object.assign(state, { day, manda: 0, gold: 0 });
  return true;
}
export function fuelItemReference() {
  const resources = [{ id: FUEL_SHOP_ID, use_type: 1, name: "Fuel", thumbnail_id: "IT_ST", amount: FUEL_SHOP_AP },
    { id: BP_SHOP_ID, use_type: 2, name: "Letters", thumbnail_id: "IT_LT", amount: BP_SHOP_AMOUNT }];
  return { item: resources.map(({ amount, ...row }) => ({ ...row, rank: 1, sell_price: 0, collect_qty: 0,
    desc: "Local revival resource refill", effect: String(amount) })), trace: [],
    global_item: resources.map(({ id }) => ({ item_id: id, buy_limit: FUEL_SHOP_LIMIT, provide_qty: 1, type: 1,
      ticket_ref_id: "", ticket_qty: 0, price_list: [1, 2].flatMap((price_type) =>
        Array.from({ length: FUEL_SHOP_LIMIT }, (_, index) => ({ price_type, buy_cnt: index + 1,
          price: FUEL_SHOP_PRICES[price_type as 1 | 2] }))) })) };
}
export function fuelPurchaseInventory(state: FuelShopState, itemId = FUEL_SHOP_ID) {
  return [{ item_id: itemId, price_type: 1, buy_cnt: state.manda },
    { item_id: itemId, price_type: 2, buy_cnt: state.gold }];
}
