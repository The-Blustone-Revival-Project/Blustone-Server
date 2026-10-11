/** ReqGuildPriceForActionCB Gf84f6c selects envelope.ret_data before calling
 * ParsePriceByActionRef Ga801ac. The parser reads action/price_type/price and
 * stores an action-keyed map. No original numeric prices are recovered.
 */
export interface GuildActionPrice { action: number; price_type: number; price: number }
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
