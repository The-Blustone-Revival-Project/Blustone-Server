import type {GuildRecord} from "./guild-lobby.js";

export interface GuildRolePolicy {formerLeaderRole:2|3;maxSupervisors:number}
/** Missing original producer defaults are REQUIRED explicit local choices. */
export function guildRolePolicy(raw:unknown):Readonly<GuildRolePolicy> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Local Guild roles require explicit policy");
  const row=raw as Record<string,unknown>;
  if(Object.keys(row).some(key=>!["formerLeaderRole","maxSupervisors"].includes(key))||
    ![2,3].includes(row.formerLeaderRole as number)||typeof row.maxSupervisors!=="number"||
    !Number.isInteger(row.maxSupervisors)||row.maxSupervisors<0||row.maxSupervisors>39)
    throw new TypeError("Invalid explicit Guild former-leader/supervisor policy");
  return Object.freeze({formerLeaderRole:row.formerLeaderRole as 2|3,maxSupervisors:row.maxSupervisors});
}
export function guildAppointRequest(payload:Record<string,unknown>) {
  if(typeof payload.target_pvid!=="string"||! /^[1-9]\d*$/.test(payload.target_pvid)||BigInt(payload.target_pvid)>0xffff_ffffn)
    throw new TypeError("Guild Appoint requires exact supported scalar target_pvid");
  const role=typeof payload.role==="number"?String(payload.role):payload.role;
  if(typeof role!=="string"||! /^[123]$/.test(role)) throw new TypeError("Guild Appoint supports original picker roles1/2/3 only");
  return {pvid:Number(payload.target_pvid),role:Number(role) as 1|2|3};
}
/** Explicit LOCAL leader management. Original promotion/transfer/default/cap
 * producer policy remains incomplete; no newcomer flags or counters invented. */
export function planLocalGuildAppoint(payload:Record<string,unknown>,records:readonly GuildRecord[],
  actor:{pvid:number;serverId:number},accounts:ReadonlyMap<number,{serverId:number}>,
  games:ReadonlyMap<number,{active:boolean}>,policy:Readonly<GuildRolePolicy>) {
  const request=guildAppointRequest(payload);
  const own=records.find(record=>record.members.some(member=>member.pvid===actor.pvid));
  if(!own||accounts.get(actor.pvid)?.serverId!==actor.serverId) throw new TypeError("Guild Appoint actor lacks established affiliation");
  const operator=own.members.find(member=>member.pvid===actor.pvid)!,target=own.members.find(member=>member.pvid===request.pvid);
  if(!target||accounts.get(target.pvid)?.serverId!==actor.serverId) throw new TypeError("Guild Appoint target is not an owned same-server member");
  // Echo only an already true result, including a transferred leader's retry
  // after it loses management authority. This grants no mutation permission.
  if(target.role===request.role) return {guilds:structuredClone(records) as GuildRecord[],id:own.id,changed:false};
  if(operator.role!==1) throw new TypeError("Local Guild Appoint mutation requires current leader");
  if(target.role===1) throw new TypeError("Demoting the current leader requires an explicit transfer target");
  if(!games.get(target.pvid)||games.get(target.pvid)!.active) throw new TypeError("Guild Appoint requires idle established target gameplay");
  const members=own.members.map(member=>({...member,role:member.pvid===target.pvid?request.role:
    request.role===1&&member.role===1?policy.formerLeaderRole:member.role}));
  if(members.some(member=>member.newbie===1&&member.role!==1&&member.role!==4))
    throw new TypeError("Guild Appoint would disagree with native newcomer role4");
  const before=own.members.filter(member=>member.role===2).length,after=members.filter(member=>member.role===2).length;
  if(after>policy.maxSupervisors&&after>before) throw new TypeError("Configured Guild supervisor capacity reached");
  return {guilds:records.map(record=>record.id===own.id?{...structuredClone(record),members}:structuredClone(record)),id:own.id,changed:true};
}
