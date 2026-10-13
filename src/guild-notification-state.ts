/** Source-backed invitation MSG2 only. Imported/produced IDs and clock values
 * are explicit local state; no original event allocator or expiry is implied. */
export interface GuildNotification {
  recipient:number;id:number;sender:number;guild_id:number;message:2;
  supplement:string;read:0|1;regdate:number;deleted:0|1;
}
export function guildNotificationRows(pvid:number,rows:readonly GuildNotification[]) {
  return rows.filter(row=>row.recipient===pvid&&!row.deleted).map(({recipient,deleted,...wire})=>({...wire}));
}
export function guildNotificationState(raw:unknown,accounts:ReadonlyMap<number,{serverId:number}>,guilds:ReadonlyMap<number,{serverId:number}>):GuildNotification[] {
  if(!Array.isArray(raw)) throw new TypeError("Guild notifications require an array");
  const ids=new Set<number>(),keys=["recipient","id","sender","guild_id","message","supplement","read","regdate","deleted"];
  return raw.map(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key))) throw new TypeError("Unsupported Guild notification record");
    const row=value as GuildNotification,recipient=accounts.get(row.recipient),sender=accounts.get(row.sender);
    if(![row.recipient,row.id,row.sender,row.guild_id].every(value=>Number.isInteger(value)&&value>0&&value<=0xffff_ffff)||
      !recipient||!sender||recipient.serverId!==sender.serverId||guilds.get(row.guild_id)?.serverId!==recipient.serverId||ids.has(row.id)||
      row.message!==2||![0,1].includes(row.read)||![0,1].includes(row.deleted)||
      !Number.isInteger(row.regdate)||row.regdate<0||row.regdate>0xffff_ffff||
      typeof row.supplement!=="string"||Buffer.from(row.supplement,"utf8").toString("utf8")!==row.supplement)
      throw new TypeError("Guild notification lacks supported unique recipient/source/identity");
    ids.add(row.id);return {...row};
  });
}
export function guildNotificationIds(payload:Record<string,unknown>):number[] {
  if(typeof payload.notification_id!=="string") throw new TypeError("Guild notification_id requires JSON-array form string");
  const decoded=JSON.parse(payload.notification_id,(_key,value,context?:{source:string})=>typeof value==="number"&&context?.source?context.source:value);
  if(!Array.isArray(decoded)||!decoded.length) throw new TypeError("Guild notifications require a nonempty identity list");
  const ids=decoded.map(value=>{
    const text=typeof value==="number"&&Number.isSafeInteger(value)?String(value):value;
    if(typeof text!=="string"||! /^[1-9]\d*$/.test(text)||BigInt(text)>0xffff_ffffn) throw new TypeError("Unsupported exact Guild notification identity");
    return Number(text);
  });
  if(new Set(ids).size!==ids.length) throw new TypeError("Duplicate Guild notification identities");
  return ids;
}
export function planGuildNotificationChange(route:string,pvid:number,payload:Record<string,unknown>,rows:readonly GuildNotification[]) {
  const ids=guildNotificationIds(payload);
  if(ids.some(id=>!rows.some(row=>row.id===id&&row.recipient===pvid))) throw new TypeError("Guild notification is unknown or owned by another recipient");
  if(!["/guild/ReadNotifications","/guild/DeleteNotifications"].includes(route)) throw new TypeError("Unsupported Guild notification mutation");
  let changed=false;
  const next=rows.map(row=>{
    if(!ids.includes(row.id)||row.recipient!==pvid||row.deleted) return {...row};
    const field=route==="/guild/ReadNotifications"?"read":"deleted";
    if(row[field]===0) {changed=true;return {...row,[field]:1};}return {...row};
  }) as GuildNotification[];
  return {next,changed};
}
