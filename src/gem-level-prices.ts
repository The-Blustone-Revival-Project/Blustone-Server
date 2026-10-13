/** Original CSRGem.ParseGemLevelUpPrices Ga54108 builds40-byte records:
 * uint32 payment/level/price, unscaled float64 possibility/compensation,
 * byte add_sub_ability. This module supplies no original numeric values. */
export interface GemLevelPrice {
  level:number;price_type:number;price:number;
  possibility:number;failed_compensation:number;add_sub_ability:0|1;
}
function record(raw:unknown):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Gem level-price object");
  return raw as Record<string,unknown>;
}
function uint(raw:unknown,key:string):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff) throw new TypeError(`Invalid uint32 Gem level-price ${key}`);
  return raw;
}
function finite(raw:unknown,key:string):number {
  if(typeof raw!=="number"||!Number.isFinite(raw)) throw new TypeError(`Invalid float64 Gem level-price ${key}`);
  // No fraction/percent conversion or guessed interval is imposed: original
  // storage is unscaled double; formula and original magnitudes remain gated.
  return raw;
}
export function gemLevelPrices(raw:unknown):GemLevelPrice[] {
  const envelope=record(raw);
  if(envelope.result_code!==1||!Array.isArray(envelope.ret_data)) throw new TypeError("Gem level prices require successful ret_data array");
  const seen=new Set<number>();
  return envelope.ret_data.map(raw=>{
    const row=record(raw),level=uint(row.level,"level"),flag=row.add_sub_ability;
    // FindGemLevelUpPrice Ga54f00 ignores its payment argument and selects
    // FIRST matching level. Distinct payment rows would still be ambiguous.
    if(seen.has(level)) throw new TypeError("Duplicate Gem level-price lookup key");
    if(flag!==0&&flag!==1&&flag!==false&&flag!==true) throw new TypeError("Gem add_sub_ability requires canonical flag");
    seen.add(level);
    return {level,price_type:uint(row.price_type,"price_type"),price:uint(row.price,"price"),
      possibility:finite(row.possibility,"possibility"),failed_compensation:finite(row.failed_compensation,"failed_compensation"),
      add_sub_ability:flag===1||flag===true?1:0};
  });
}
/** Native lookup ignores PRICE_TYPE. Missing sentinel9/0/0 is unavailable. */
export const gemLevelPriceAt=(table:readonly GemLevelPrice[],level:number)=>table.find(row=>row.level===level);
