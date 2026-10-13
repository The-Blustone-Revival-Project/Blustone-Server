import {parseGuildInfoQuery} from "./guild-info-query.js";
import {guildDetailRows} from "./guild-detail-rows.js";
import type {GuildRecord} from "./guild-lobby.js";
/** Native RequestUserInfo wraps ONE uint64 in target_pvid_list JSON form.
 * Its callback consumes only first USER; arbitrary batching is not supported. */
export function parseGuildUserQuery(raw:unknown):string {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Guild user query");
  const ids=parseGuildInfoQuery({guild_id:(raw as Record<string,unknown>).target_pvid_list});
  if(ids.length!==1) throw new TypeError("Guild user association requires one target pvid");
  return ids[0];
}
/** Read only established same-server affiliation. Compact USER summary fields
 * come from explicitly supplied Guild INFO; contribution uses its known Guild
 * aggregate as LOCAL projection policy, not recovered original counter lineage.
 * Unknown/unjoined/cross-server return[], never invent a zero-affiliation row. */
export function guildUserRows(target:string,records:readonly GuildRecord[],serverId:number,
  accounts:ReadonlyMap<number,{serverId:number}>) {
  const account=[...accounts].find(([pvid])=>String(pvid)===target);
  if(!account||account[1].serverId!==serverId) return [];
  const matching=records.filter(record=>record.members.some(member=>String(member.pvid)===target));
  if(matching.length>1) throw new TypeError("Conflicting established Guild affiliations");
  if(matching.length===0) return [];
  const rows=guildDetailRows([String(matching[0].id)],matching,serverId,accounts);
  return rows.map(info=>({pvid:account[0],id:info.id,name:info.name,type:info.type,fc_point_limit:info.fc_point_limit,
    contribution:info.contribution,region:info.region,emblem_id:info.emblem_id}));
}
