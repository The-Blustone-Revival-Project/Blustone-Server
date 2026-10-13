/** CSRGuild.RequestRank Ga7b03c sends signed-int page/size decimal form
 * values. Native tab starts page0,size10. No rank creation or snapshot
 * completeness is established by this request grammar. */
export function parseGuildRankingQuery(raw:unknown):{page:number;size:number} {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Guild ranking query");
  const row=raw as Record<string,unknown>;
  const integer=(raw:unknown,label:string,minimum:number)=>{
    const text=typeof raw==="number"&&Number.isInteger(raw)?String(raw):raw;
    if(typeof text!=="string"||!/^(?:0|[1-9]\d*)$/.test(text)||BigInt(text)>0x7fff_ffffn||Number(text)<minimum)
      throw new TypeError(`Invalid nonnegative signed32 Guild ranking ${label}`);
    return Number(text);
  };
  return {page:integer(row.page,"page",0),size:integer(row.size,"size",1)};
}
