import type {GuildRecord} from "./guild-lobby.js";
import {guildDetailRows} from "./guild-detail-rows.js";
import {parseGuildRankingQuery} from "./guild-ranking-query.js";
export {parseGuildRankingQuery} from "./guild-ranking-query.js";

/** Read-only known-record ranking subset. Preserve explicitly stored positive
 * INFO.rank; never compute ranks from membership, contribution or array order.
 * Same-server visibility, omitted rank0, rank/ID ordering and pagination over
 * the KNOWN subset are local policy, not original global-ranking completeness.
 * RequestRank's actual callback consumes a bare ret_data INFO array. */
export function guildRankingRows(raw:unknown,records:readonly GuildRecord[],serverId:number,
  accounts:ReadonlyMap<number,{serverId:number}>) {
  const {page,size}=parseGuildRankingQuery(raw);
  const visible=guildDetailRows(records.map(record=>String(record.id)),records,serverId,accounts)
    .filter(record=>record.rank>0).sort((a,b)=>a.rank-b.rank||a.id-b.id);
  const offset=BigInt(page)*BigInt(size);
  // Never round a large page*size product into a different slice boundary.
  if(offset>=BigInt(visible.length)) return [];
  const start=Number(offset),end=Number(offset+BigInt(size)>BigInt(visible.length)?BigInt(visible.length):offset+BigInt(size));
  return visible.slice(start,end);
}
