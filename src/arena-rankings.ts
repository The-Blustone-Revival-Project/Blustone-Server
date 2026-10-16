export interface ArenaStandingSource {pvid:number;rating_point:number;win:number;lose:number}
export interface ArenaStanding extends ArenaStandingSource {rank:number}
function identity(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<=0)throw new TypeError("Arena standing requires a positive exact local identity");return raw;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("Arena standing counter requires uint32");return raw;
}
/** Explicit LOCAL sequential ranking: rating DESC, exact local pvid ASC for
 * ties. Win/loss counters are preserved but do not silently break ties.
 * Caller independently establishes the population; this is not global-world
 * matchmaking, a recovered original tie rule or an inferred seasonal reset. */
export function localArenaStandings(rows:readonly ArenaStandingSource[]):ArenaStanding[] {
  if(!Array.isArray(rows)||rows.length>0xffff_ffff)throw new TypeError("Arena standings require a bounded array");
  const seen=new Set<number>();
  return Array.from(rows,row=>{
    if(!row||typeof row!=="object")throw new TypeError("Arena standing row is unavailable");
    const pvid=identity(row.pvid);if(seen.has(pvid))throw new TypeError("Arena standing identity is duplicated");seen.add(pvid);
    return {pvid,rating_point:uint(row.rating_point),win:uint(row.win),lose:uint(row.lose)};
  }).sort((a,b)=>b.rating_point-a.rating_point||a.pvid-b.pvid).map((row,index)=>({...row,rank:uint(index+1)}));
}
/** Friend receiver narrows pvid to U32. Filter the established local standings
 * without renumbering: hidden participants retain their global-local position.
 * Visible wide identities refuse instead of aliasing. No source state changes. */
export function friendArenaRanking(standings:readonly ArenaStanding[],actorPvid:number,visibleFriendIds:ReadonlySet<number>):{list:ArenaStanding[]} {
  identity(actorPvid);
  const valid=localArenaStandings(standings);
  if(valid.length!==standings.length||valid.some((row,index)=>row.pvid!==standings[index].pvid||row.rank!==standings[index].rank))
    throw new TypeError("Friend ranking requires canonical established local standings");
  if(!valid.some(row=>row.pvid===actorPvid))throw new TypeError("Friend ranking requires its own standing");
  const list=valid.filter(row=>row.pvid===actorPvid||visibleFriendIds.has(row.pvid));
  if(list.some(row=>row.pvid>0xffff_ffff))throw new TypeError("Visible friend ranking identity exceeds native uint32");
  return {list};
}
