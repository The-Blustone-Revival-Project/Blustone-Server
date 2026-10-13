import {parseGuildFoundRequest} from "./guild-found-request.js";
import {guildTextInput,guildFcPointLimit} from "./guild-text-input.js";
import {GUILD_PICKER_EMBLEMS} from "./guild-emblems.js";
import type {GuildRecord} from "./guild-lobby.js";
import {guildActionPrices,type GuildActionPrice} from "./guild-prices.js";

/** Explicit LOCAL gold2 creation, not recovered production admission. Native
 * text/font/bad-word and server permission corpora remain incomplete. This
 * mode supports a printable ASCII subset and known joined-record ownership. */
export function planLocalGuildFound(raw:unknown,records:readonly GuildRecord[],accounts:ReadonlyMap<number,{serverId:number}>,
  owner:{pvid:number;serverId:number},gold:number,fcPoint:number,id:number,prices:readonly GuildActionPrice[]) {
  try {
    const request=parseGuildFoundRequest(raw,new Set<string>(GUILD_PICKER_EMBLEMS));
    guildTextInput("name",request.name);guildTextInput("desc",request.desc);guildFcPointLimit(request.fc_point_limit);
    if(!/^[A-Za-z0-9 _-]+$/.test(request.name)||request.name.trim()!==request.name||!request.name.trim()||
      !/^[\x20-\x7e]*$/.test(request.desc)||!request.region.length||! /^[A-Za-z0-9_-]{1,32}$/.test(request.region))
      throw new TypeError("Local Guild creation supports nonempty selected region and printable ASCII text subset only");
    if(accounts.get(owner.pvid)?.serverId!==owner.serverId) throw new TypeError("Guild founder is not an established account");
    if(records.some(record=>record.members.some(member=>member.pvid===owner.pvid))) throw new TypeError("Founder already has an established Guild");
    if(records.some(record=>record.members.some(member=>accounts.get(member.pvid)?.serverId===owner.serverId)&&record.name.toLowerCase()===request.name.toLowerCase()))
      throw new TypeError("Local Guild name already exists on this server");
    if(!Number.isInteger(id)||id<1||id>0xffff_ffff||records.some(record=>record.id===id)) throw new TypeError("Local Guild identity is unavailable");
    if(!Number.isInteger(gold)||gold<0||gold>0xffff_ffff||!Number.isInteger(fcPoint)||fcPoint<0||fcPoint>0x7fff_ffff)
      throw new TypeError("Invalid founder wallet or local FC snapshot");
    const fee=guildActionPrices({result_code:1,ret_data:prices}).find(row=>row.action===1);
    if(!fee||fee.price_type!==2) throw new TypeError("Local creation requires explicit action1 gold2 quote");
    if(gold<fee.price) throw new TypeError("Insufficient gold for configured Guild creation");
    const created:GuildRecord={id,...request,contribution:0,rank:0,gvg_win_cnt:0,gvg_inf_win_cnt:0,
      members:[{pvid:owner.pvid,contribution:0,newbie:0,role:1,fc_point:fcPoint}]};
    return {created,gold:gold-fee.price,fee:fee.price,nextId:id+1};
  }catch(error){return {error:error instanceof Error?error.message:"Invalid local Guild creation"};}
}
