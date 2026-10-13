/** CSRGuild.RequestInfo Ga68e94 posts /guild/GetDetailInfo. The singular form
 * key guild_id contains a JSON STRING encoding a list<uint64>, even for one
 * ID. Positive unique identity admission is replica policy. Native response
 * INFO.id is only uint32; caller must refuse unsupported publication IDs. */
export function parseGuildInfoQuery(raw:unknown):string[] {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Guild detail query object");
  const value=(raw as Record<string,unknown>).guild_id;
  if(typeof value!=="string") throw new TypeError("Guild guild_id requires JSON-array form string");
  const decoded=JSON.parse(value,(_key,value,context?:{source:string})=>{
    if(typeof value==="number"&&context?.source&&/^(?:0|[1-9]\d*)$/.test(context.source)) return context.source;
    return value;
  });
  if(!Array.isArray(decoded)) throw new TypeError("Guild guild_id requires an array, including singleton queries");
  const ids=decoded.map(value=>{
    const id=typeof value==="number"&&Number.isSafeInteger(value)?String(value):value;
    if(typeof id!=="string"||! /^[1-9]\d*$/.test(id)||BigInt(id)>0xffff_ffff_ffff_ffffn)
      throw new TypeError("Invalid exact uint64 Guild detail identity");
    return id;
  });
  if(new Set(ids).size!==ids.length) throw new TypeError("Duplicate Guild detail identity");
  return ids;
}
