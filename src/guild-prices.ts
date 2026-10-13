/** ReqGuildPriceForActionCB Gf84f6c selects envelope.ret_data before calling
 * ParsePriceByActionRef Ga801ac. The parser reads action/price_type/price and
 * stores an action-keyed map. No original numeric prices are recovered.
 */
export interface GuildActionPrice { action: number; price_type: number; price: number }
/** CSRSyncRef constructor/Init match URI_COMPLETE0x21 to this callback. */
export const GUILD_ACTION_PRICE_ROUTE = "/reference/GetGuildPrices";
export const GUILD_PAY_ACTIONS = Object.freeze({creation:1,nameChange:2,countryChange:3} as const);
export function guildActionPrices(envelope: unknown): GuildActionPrice[] {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new TypeError("Expected Guild price response");
  const response = envelope as Record<string, unknown>;
  if (response.result_code !== 1 || !Array.isArray(response.ret_data)) throw new TypeError("Expected successful Guild price ret_data rows");
  const actions = new Set<number>();
  return response.ret_data.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Invalid Guild price row");
    const row = raw as GuildActionPrice;
    if (![row.action, row.price_type, row.price].every((value) => Number.isInteger(value) && value >= 0 && value <= 0x7fff_ffff) ||
        actions.has(row.action)) throw new TypeError("Invalid or duplicate Guild action price");
    actions.add(row.action);
    return { action: row.action, price_type: row.price_type, price: row.price };
  });
}

/** UI SetCommon caches FindPrice(action1) at+930. BT_CREATE compares its first
 * word (price) with PlayData.gold at Gfcf65e..70 before RequestBuild. This is
 * the client's affordability gate, NOT proof of original server settlement
 * currency or recovered PRICE_TYPE meaning. Missing row never implies free.
 */
export function guildCreationPrice(table: readonly GuildActionPrice[]) {
  const row = table.find((price) => price.action === 1);
  return row ? { ...row, client_gold_gate: row.price, settlement_wallet: "unrecovered" as const } : undefined;
}

/** SetGuildName+956 and SetCountry+957 control cached action2/action3 prices.
 * GetChangePrice adds the changed-field prices; Modify checks total Manda.
 * This is ONLY the original UI affordability quote. No settlement, free/paid
 * debit order, role permission or zero-fee modification is authorized here. */
export function guildModificationPrice(table:readonly GuildActionPrice[],changes:{name_changed:boolean;country_changed:boolean}) {
  if(!changes||typeof changes.name_changed!=="boolean"||typeof changes.country_changed!=="boolean")
    throw new TypeError("Guild change quote requires explicit name/country flags");
  const rows=guildActionPrices({result_code:1,ret_data:table});
  const actions=[...(changes.name_changed?[GUILD_PAY_ACTIONS.nameChange]:[]),
    ...(changes.country_changed?[GUILD_PAY_ACTIONS.countryChange]:[])];
  const selected:GuildActionPrice[]=[];
  for(const action of actions) {
    const row=rows.find(row=>row.action===action);
    if(!row) return undefined;
    selected.push({...row});
  }
  const price=selected.reduce((sum,row)=>sum+row.price,0);
  return {actions:selected,client_manda_gate:price,settlement_wallet:"unrecovered" as const};
}
