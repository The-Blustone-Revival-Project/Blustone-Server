import type {LocalCardInstance} from "./game.js";

/** Local bounded admission; no original batch quota was recovered. */
export const LOCAL_CARD_SYNC_MAX=1024;
export function cardSyncIds(raw:unknown):string[] {
  let tokens:string[];
  if(typeof raw==="string") {
    if(raw.length>32768||!(/^[ \t\r\n]*\[[ \t\r\n]*(?:[1-9]\d*[ \t\r\n]*(?:,[ \t\r\n]*[1-9]\d*[ \t\r\n]*)*)?\][ \t\r\n]*$/).test(raw))
      throw new TypeError("Card sync requires a JSON numeric identity list");
    const body=raw.trim().slice(1,-1).trim();tokens=body?body.split(",").map(value=>value.trim()):[];
  }else if(Array.isArray(raw)&&raw.length<=LOCAL_CARD_SYNC_MAX) {
    tokens=Array.from(raw,value=>{
      if(typeof value!=="number"||!Number.isSafeInteger(value)||value<=0)throw new TypeError("Card sync array IDs require exact positive integers");
      return String(value);
    });
  }else throw new TypeError("Card sync requires a bounded identity list");
  if(tokens.length>LOCAL_CARD_SYNC_MAX||tokens.some(id=>BigInt(id)>0xffff_ffff_ffff_ffffn))
    throw new TypeError("Card sync identity width/batch limit exceeded");
  return [...new Set(tokens)];
}
/** Native ReqSyncCardInstance's E0 callback consumes ret_data.card and
 * replaces each returned instance via RemoveCard/AddCard. Return absolute full
 * existing owned DTOs; never grant an unknown ID, emit deltas or clear a roster.
 * Unknown IDs refuse the complete batch as explicit LOCAL admission policy. */
export function syncOwnedCards(raw:unknown,owned:readonly LocalCardInstance[]) {
  const requested=cardSyncIds(raw),index=new Map<string,LocalCardInstance>();
  for(const row of owned) {
    if(!Number.isSafeInteger(row.inst_id)||row.inst_id<=0||index.has(String(row.inst_id)))
      throw new TypeError("Card sync owned identity is malformed or duplicated");
    index.set(String(row.inst_id),row);
  }
  return {card:requested.map(id=>{
    const row=index.get(id);if(!row)throw new TypeError("Card sync identity is not owned");
    return structuredClone(row);
  })};
}
