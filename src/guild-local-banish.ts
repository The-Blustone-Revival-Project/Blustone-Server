import type {GuildRecord} from "./guild-lobby.js";

/** Explicit LOCAL indefinite Guild ban. Known-complete scalar history is
 * required; never replace omitted/unknown older history with an invented []. */
export function planLocalGuildBanish(payload:Record<string,unknown>,records:readonly GuildRecord[],
  actor:{pvid:number;serverId:number},accounts:ReadonlyMap<number,{serverId:number}>,games:ReadonlyMap<number,{active:boolean}>) {
  if(typeof payload.target_pvid!=="string"||! /^[1-9]\d*$/.test(payload.target_pvid)||BigInt(payload.target_pvid)>0xffff_ffffn)
    throw new TypeError("Guild Banish requires exact supported scalar target_pvid");
  const pvid=Number(payload.target_pvid),own=records.find(record=>record.members.some(member=>member.pvid===actor.pvid));
  if(!own||accounts.get(actor.pvid)?.serverId!==actor.serverId) throw new TypeError("Guild Banish actor lacks established affiliation");
  const operator=own.members.find(member=>member.pvid===actor.pvid)!;
  if(![1,2].includes(operator.role)) throw new TypeError("Local Guild Banish requires manager role1or2");
  if(!Array.isArray(own.banished)) throw new TypeError("Guild ban history is not established; refusing replacement");
  if(accounts.get(pvid)?.serverId!==actor.serverId||pvid===actor.pvid) throw new TypeError("Guild Banish target is foreign/unknown or self");
  if(own.banished.includes(pvid)) return {guilds:structuredClone(records) as GuildRecord[],id:own.id,changed:false};
  const target=own.members.find(member=>member.pvid===pvid);
  if(!target||target.role===1||(operator.role===2&&target.role===2)) throw new TypeError("Guild Banish target is not an eligible owned member");
  if(!games.get(pvid)||games.get(pvid)!.active) throw new TypeError("Guild Banish requires idle established target gameplay");
  const members=own.members.filter(member=>member.pvid!==pvid),banished=[...own.banished,pvid];
  return {guilds:records.map(record=>record.id===own.id?{...structuredClone(record),members,member_cnt:members.length,banished}:structuredClone(record)),
    id:own.id,changed:true};
}
