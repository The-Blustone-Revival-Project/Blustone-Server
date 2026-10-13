import type {GuildRecord} from "./guild-lobby.js";
import {guildDetailRows} from "./guild-detail-rows.js";
export type GuildDiscoveryRoute="/guild/Search"|"/guild/GetRecommendations";
/** Native Search has one plain keyword string; Recommendations has auth only.
 * Neither method sends or parses a page/cursor/limit parameter. */
export function parseGuildDiscoveryRequest(route:string,raw:unknown):{keyword:string|null} {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Guild discovery query");
  if(route==="/guild/GetRecommendations") return {keyword:null};
  if(route!=="/guild/Search") throw new TypeError("Unsupported Guild discovery route");
  const keyword=(raw as Record<string,unknown>).keyword;
  if(typeof keyword!=="string") throw new TypeError("Guild Search keyword requires plain string");
  return {keyword};
}
/** Explicit local discovery policy, not original ranking or join eligibility:
 * all established same-server Guilds, name-only case-insensitive substring,
 * stable ascending Guild ID. Empty keyword matches all; recommendations use
 * the same known corpus. No membership, wallet, rewards or history changes. */
export function guildDiscoveryRows(query:{keyword:string|null},records:readonly GuildRecord[],serverId:number,
  accounts:ReadonlyMap<number,{serverId:number}>) {
  if(query.keyword!==null&&typeof query.keyword!=="string") throw new TypeError("Invalid Guild discovery keyword");
  const seen=new Set<number>();
  const ids=records.map(record=>{
    if(seen.has(record.id)) throw new TypeError("Duplicate established Guild discovery identity");
    seen.add(record.id);return record.id;
  }).sort((a,b)=>a-b).map(String);
  const rows=guildDetailRows(ids,records,serverId,accounts);
  const keyword=query.keyword?.toLowerCase();
  return keyword===undefined?rows:rows.filter(row=>row.name.toLowerCase().includes(keyword));
}
