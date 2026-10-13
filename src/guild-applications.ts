import type {GuildRecord} from "./guild-lobby.js";

/** Distinct LOCAL pending ownership. Pending actors never become joined members
 * merely to make lobby serialization convenient. Native receipt projection is
 * separate from this internal persisted shape. */
export interface GuildApplication {pvid:number;guild_id:number;desc:string;fc_point:number;applied:number}
export function guildApplications(raw:unknown,records:readonly GuildRecord[],accounts:ReadonlyMap<number,{serverId:number}>):GuildApplication[] {
  if(!Array.isArray(raw)) throw new TypeError("Guild applications require an array");
  const seen=new Set<number>();
  return raw.map(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(key=>!["pvid","guild_id","desc","fc_point","applied"].includes(key)))
      throw new TypeError("Malformed or unsupported Guild application record");
    const row=value as GuildApplication,target=records.find(record=>record.id===row.guild_id),actor=accounts.get(row.pvid);
    if(!Number.isSafeInteger(row.pvid)||row.pvid<1||row.pvid>0xffff_ffff||!actor||seen.has(row.pvid)||!target||
      target.members.some(member=>accounts.get(member.pvid)?.serverId!==actor.serverId)||target.banished?.includes(row.pvid)||
      records.some(record=>record.members.some(member=>member.pvid===row.pvid))||
      typeof row.desc!=="string"||Buffer.from(row.desc,"utf8").toString("utf8")!==row.desc||
      ![row.fc_point,row.applied].every(value=>Number.isInteger(value)&&value>=0&&value<=0xffff_ffff))
      throw new TypeError("Guild application lacks unique unjoined same-server ownership");
    seen.add(row.pvid);
    return {pvid:row.pvid,guild_id:row.guild_id,desc:row.desc,fc_point:row.fc_point,applied:row.applied};
  });
}
export function guildApplicantRows(guildId:number,applications:readonly GuildApplication[]) {
  return applications.filter(row=>row.guild_id===guildId).map(({pvid,desc,fc_point,applied})=>({pvid,desc,fc_point,applied}));
}
export function guildPendingLobby(pvid:number,applications:readonly GuildApplication[]) {
  const pending=applications.find(row=>row.pvid===pvid);
  return pending?{my_guild:{guild_id:pending.guild_id,status:1,newbie:0,role:0,contribution:0}}:null;
}
