import type {GuildRecord} from "./guild-lobby.js";
import {parseGuildUpdateRequest} from "./guild-update-request.js";
import {GUILD_PICKER_EMBLEMS,GUILD_SPRITE_EMBLEMS} from "./guild-emblems.js";
import {guildTextInput,guildFcPointLimit} from "./guild-text-input.js";
import {guildModificationPrice,type GuildActionPrice} from "./guild-prices.js";

/** Explicit LOCAL settings update. Roles1/2 have original management UI
 * access; using them as server authorization and free-first debit are local
 * policy. Original badword/font/country/pending rules remain unproved. */
export function planLocalGuildUpdate(raw:unknown,records:readonly GuildRecord[],accounts:ReadonlyMap<number,{serverId:number}>,
  actor:{pvid:number;serverId:number},paid:number,free:number,prices:readonly GuildActionPrice[]) {
  try {
    const request=parseGuildUpdateRequest(raw,new Set<string>(GUILD_SPRITE_EMBLEMS));
    guildTextInput("name",request.name);guildTextInput("desc",request.desc);guildFcPointLimit(request.fc_point_limit);
    if(!/^[A-Za-z0-9 _-]+$/.test(request.name)||request.name.trim()!==request.name||!request.name.trim()||
      !/^[\x20-\x7e]*$/.test(request.desc)||! /^[A-Za-z0-9_-]{1,32}$/.test(request.region)) throw new TypeError("Local Guild update supports ASCII subset and selected nonempty region");
    if(accounts.get(actor.pvid)?.serverId!==actor.serverId) throw new TypeError("Guild manager is not an established account");
    const joined=records.filter(record=>record.members.some(member=>member.pvid===actor.pvid));
    if(joined.length!==1) throw new TypeError("Guild manager needs one established affiliation");
    const current=joined[0],member=current.members.find(member=>member.pvid===actor.pvid)!;
    if(![1,2].includes(member.role)) throw new TypeError("Local Guild update requires management role1or2");
    if(request.emblem_id!==current.emblem_id&&!(GUILD_PICKER_EMBLEMS as readonly string[]).includes(request.emblem_id))
      throw new TypeError("Changed Guild emblem requires stock picker identity");
    if(records.some(record=>record.id!==current.id&&record.members.some(member=>accounts.get(member.pvid)?.serverId===actor.serverId)&&record.name.toLowerCase()===request.name.toLowerCase()))
      throw new TypeError("Local Guild name already exists on this server");
    if(![paid,free].every(value=>Number.isInteger(value)&&value>=0&&value<=0xffff_ffff)||paid+free>0xffff_ffff)
      throw new TypeError("Manda wallets exceed supported native uint32 total");
    const quote=guildModificationPrice(prices,{name_changed:request.name!==current.name,country_changed:request.region!==current.region});
    if(!quote) throw new TypeError("Changed Guild name/region has missing action quote");
    if(quote.actions.some(row=>row.price_type!==1)||quote.client_manda_gate>0x7fff_ffff) throw new TypeError("Local update supports Manda1 quotes with signed32 debit deltas");
    const fee=quote.client_manda_gate;
    if(paid+free<fee) throw new TypeError("Insufficient Manda for configured Guild update");
    const keys=["name","desc","type","fc_point_limit","region","emblem_id"] as const;
    const changed=keys.some(key=>request[key]!==current[key]),freeSpent=Math.min(free,fee);
    const next=records.map(record=>record.id===current.id?{...structuredClone(record),...request}:structuredClone(record));
    return {next,id:current.id,changed,fee,paid:paid-(fee-freeSpent),free:free-freeSpent};
  }catch(error){return {error:error instanceof Error?error.message:"Invalid local Guild update"};}
}
