import type {LocalGameState} from "./game.js";
import {earnedStageOrders} from "./progression.js";

export interface FriendMissionPeer {pvid:number;profile_url:string;game:LocalGameState|undefined}
/** Source-shaped record consumed by CSRPlayData.SetFriendMissionRecordList.
 * Local account identities are positive safe integers within native uint64. */
export interface FriendMissionRecord {pvid:number;profile_url:string;stage:string}

/** LOCAL placement policy: the last actually earned stage in published
 * ordinary campaign/link order. No unlocked-stage, active-attempt or diagnostic
 * seed-star projection is used. Caller must establish accepted, same-server,
 * mutually nonblocked friendship before supplying a peer. No game is created.
 * Native source proves the record/cache contract, not original placement law. */
export function friendMissionRecords(peers:readonly FriendMissionPeer[],stageOrder:readonly string[]):FriendMissionRecord[] {
  if(stageOrder.some(id=>typeof id!=="string"||!id.startsWith("n_"))||new Set(stageOrder).size!==stageOrder.length)
    throw new TypeError("Friend mission records require unique published ordinary stage order");
  const seen=new Set<number>(),rows:FriendMissionRecord[]=[];
  for(const peer of peers) {
    if(!Number.isSafeInteger(peer.pvid)||peer.pvid<=0||seen.has(peer.pvid)||typeof peer.profile_url!=="string"||
      Buffer.from(peer.profile_url,"utf8").toString("utf8")!==peer.profile_url)
      throw new TypeError("Invalid or duplicate local friend mission identity/profile");
    seen.add(peer.pvid);
    if(!peer.game)continue;
    let stage:string|undefined;
    for(const id of stageOrder)if(earnedStageOrders(peer.game,id).length>0)stage=id;
    if(stage)rows.push({pvid:peer.pvid,profile_url:peer.profile_url,stage});
  }
  return rows.sort((a,b)=>a.pvid-b.pvid);
}
