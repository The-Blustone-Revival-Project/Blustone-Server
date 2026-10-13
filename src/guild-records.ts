import {readFileSync} from "node:fs";
import {repositoryPath} from "./paths.js";
import {guildInfo,type GuildRecord} from "./guild-lobby.js";
import {GUILD_EMBLEM_SOURCE,GUILD_SPRITE_EMBLEMS,verifyGuildEmblemSource} from "./guild-emblems.js";

/** Explicit supplied joined records from a local save. This does not
 * create Guilds, invite/assign members, infer pending statuses or grant rewards.
 * Unsupported history is refused rather than silently dropped on persistence. */
export function establishedGuildRecords(raw:unknown,accounts:ReadonlyMap<number,{serverId:number}>):GuildRecord[] {
  if(!Array.isArray(raw)) throw new TypeError("Established Guilds must be an array");
  if(!raw.length) return [];
  verifyGuildEmblemSource(readFileSync(repositoryPath(GUILD_EMBLEM_SOURCE.path)));
  const knownAccounts=new Set(accounts.keys()),knownEmblems=new Set<string>(GUILD_SPRITE_EMBLEMS);
  const guildIds=new Set<number>(),memberIds=new Set<number>();
  const keys=new Set(["id","name","type","fc_point_limit","contribution","region","emblem_id","desc","rank","gvg_win_cnt","gvg_inf_win_cnt","members","member_cnt","banished","invited_guests"]);
  const memberKeys=new Set(["pvid","contribution","newbie","role","fc_point"]);
  return raw.map(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(key=>!keys.has(key)))
      throw new TypeError("Malformed or unsupported established Guild record");
    const source=value as GuildRecord&{member_cnt?:number};
    if(!Array.isArray(source.members)||source.members.some(member=>!member||typeof member!=="object"||Array.isArray(member)||Object.keys(member).some(key=>!memberKeys.has(key))))
      throw new TypeError("Malformed or unsupported established Guild member record");
    const info=guildInfo(source,knownAccounts,knownEmblems);
    if(guildIds.has(info.id)) throw new TypeError("Duplicate established Guild ID");
    guildIds.add(info.id);
    if(source.member_cnt!==undefined&&source.member_cnt!==info.member_cnt) throw new TypeError("Established Guild member count mismatch");
    const serverIds=new Set(info.members.map(member=>accounts.get(member.pvid)!.serverId));
    if(serverIds.size!==1) throw new TypeError("Guild contains different-server accounts");
    if(info.banished?.some(pvid=>!serverIds.has(accounts.get(pvid)!.serverId))) throw new TypeError("Guild ban contains different-server accounts");
    if(info.invited_guests?.some(row=>!serverIds.has(accounts.get(row.pvid)!.serverId))) throw new TypeError("Guild invitation contains different-server accounts");
    for(const member of info.members) {
      if(memberIds.has(member.pvid)) throw new TypeError("Account has conflicting Guild memberships");
      memberIds.add(member.pvid);
    }
    return info;
  });
}
