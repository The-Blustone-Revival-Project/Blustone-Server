import type {GuildRecord} from "./guild-lobby.js";

/** LOCAL gold donation, matching native slider/preview but not claiming original
 * server eligibility/counter/limit/retry laws. Each accepted request is a new
 * donation; auth+amount carries no proven transaction identity. */
export function planLocalGuildDonate(raw:unknown,records:readonly GuildRecord[],accounts:ReadonlyMap<number,{serverId:number}>,
  actor:{pvid:number;serverId:number},gold:number) {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||!Object.hasOwn(raw,"amount"))throw new TypeError("Donation requires scalar amount");
  const descriptor=Object.getOwnPropertyDescriptor(raw,"amount");
  if(!descriptor||!Object.hasOwn(descriptor,"value"))throw new TypeError("Donation amount requires data value");
  const value=descriptor.value;
  const amount=typeof value==="string"&&/^(?:0|[1-9]\d*)$/.test(value)?Number(value):value;
  if(typeof amount!=="number"||!Number.isInteger(amount)||amount<1000||amount>100000||amount%1000!==0)
    throw new TypeError("Local donation requires positive1000 gold steps up to100000");
  if(!Number.isInteger(gold)||gold<amount||gold>0xffff_ffff)throw new TypeError("Insufficient or invalid donation gold");
  if(accounts.get(actor.pvid)?.serverId!==actor.serverId)throw new TypeError("Donation requires established same-server actor");
  const affiliated=records.filter(record=>record.members.some(member=>member.pvid===actor.pvid));
  if(affiliated.length!==1)throw new TypeError("Donation requires one established joined Guild");
  const own=affiliated[0],member=own.members.find(row=>row.pvid===actor.pvid)!;
  if(own.members.some(row=>accounts.get(row.pvid)?.serverId!==actor.serverId))throw new TypeError("Donation refuses different-server Guild");
  const points=Math.floor(amount/10);
  // Existing Guild model admits signed-positive totals although native parsers
  // use unsigned words. Refuse overflow instead of narrowing or wrapping saves.
  for(const total of [own.contribution,member.contribution])if(!Number.isInteger(total)||total<0||total>0x7fff_ffff-points)
    throw new TypeError("Local donation contribution exceeds established model range");
  const guilds=structuredClone(records) as GuildRecord[];
  const next=guilds.find(record=>record.id===own.id)!;
  next.contribution+=points;next.members.find(row=>row.pvid===actor.pvid)!.contribution+=points;
  return {id:own.id,guilds,gold:gold-amount,points};
}
