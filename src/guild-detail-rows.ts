import {guildInfo,type GuildRecord} from "./guild-lobby.js";
import {GUILD_SPRITE_EMBLEMS} from "./guild-emblems.js";

/** Established same-server public INFO only. Request IDs never create records
 * or membership. Cross-server/unknown queries yield no row; missing accounts
 * in an established record are corrupt state, not an invented public member. */
export function guildDetailRows(ids:readonly string[],records:readonly GuildRecord[],serverId:number,
  accounts:ReadonlyMap<number,{serverId:number}>) {
  const byId=new Map(records.map(record=>[String(record.id),record]));
  const knownAccounts=new Set(accounts.keys()),knownEmblems=new Set<string>(GUILD_SPRITE_EMBLEMS);
  return ids.flatMap(id=>{
    const record=byId.get(id);
    if(!record) return [];
    const owners=record.members.map(member=>accounts.get(member.pvid));
    if(owners.some(owner=>!owner)) throw new TypeError("Established Guild contains unknown account");
    if(owners.some(owner=>owner!.serverId!==serverId)) return [];
    return [guildInfo(record,knownAccounts,knownEmblems)];
  });
}
