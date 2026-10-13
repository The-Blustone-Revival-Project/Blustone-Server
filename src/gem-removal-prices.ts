/** Original ParseGemDisassemblePrices Ga54528: uint32 level/price_type/price.
 * Strict canonical numeric rows and duplicate rejection are local policy.
 * No original numeric balances are supplied by this module. */
export interface GemRemovalPrice {level:number;price_type:number;price:number}
export function gemRemovalPrices(raw:unknown):GemRemovalPrice[] {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Gem removal-price envelope");
  const envelope=raw as Record<string,unknown>;
  if(envelope.result_code!==1||!Array.isArray(envelope.ret_data)) throw new TypeError("Gem removal prices require successful ret_data array");
  const seen=new Set<string>();
  return envelope.ret_data.map(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value)) throw new TypeError("Expected Gem removal-price row");
    const row=value as Record<string,unknown>;
    for(const key of ["level","price_type","price"]) {
      const value=row[key];
      if(typeof value!=="number"||!Number.isInteger(value)||value<0||value>0xffff_ffff)
        throw new TypeError(`Invalid uint32 Gem removal ${key}`);
    }
    const result={level:row.level as number,price_type:row.price_type as number,price:row.price as number};
    const key=`${result.level}:${result.price_type}`;
    if(seen.has(key)) throw new TypeError("Duplicate Gem removal level/payment quote");
    seen.add(key);return result;
  });
}
/** Native exact first-match lookup; missing native sentinel9/0/0 is NOT a fee. */
export const gemRemovalPriceAt=(rows:readonly GemRemovalPrice[],level:number,priceType:number)=>
  rows.find(row=>row.level===level&&row.price_type===priceType);
