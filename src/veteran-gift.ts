export interface VeteranGiftPolicy {readonly pointsPerTicket:number}
export interface VeteranGiftOwned {inst_id:number|string;ref_id:string;qty:number;lock:number}
const U32=0xffff_ffff,U64=0xffff_ffff_ffff_ffffn;
function identity(raw:unknown):string {
  const text=typeof raw==="number"&&Number.isSafeInteger(raw)&&raw>0?String(raw):typeof raw==="string"?raw:"";
  if(text.length>20||! /^[1-9]\d*$/.test(text)||BigInt(text)>U64)throw new TypeError("Exact positive uint64 gift identity required");
  return text;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>U32)throw new TypeError("Gift quantity/points require uint32");
  return raw;
}
function positive(raw:unknown):number {
  const number=typeof raw==="string"&&/^[1-9]\d*$/.test(raw)&&raw.length<=10?Number(raw):raw;
  const value=uint(number);if(value===0)throw new TypeError("Gift quantity/points must be positive");return value;
}
function policyValid(policy:VeteranGiftPolicy) {
  if(uint(policy?.pointsPerTicket)===0)throw new TypeError("Gift points must be positive");
}
/** Disabled by default. The recipient benefit is an explicit LOCAL policy;
 * original GC6 gift benefit/economy is not recovered from its native identity. */
export function configuredVeteranGift(mode:unknown,rawPoints:unknown):VeteranGiftPolicy|undefined {
  if(mode===undefined||mode==="disabled")return undefined;
  if(mode!=="local-points")throw new TypeError("Unknown Veteran gift mode");
  return Object.freeze({pointsPerTicket:positive(rawPoints)});
}
export function veteranGiftItem(policy:VeteranGiftPolicy) {
  policyValid(policy);
  return {id:"GC6",name:"Veteran Ticket",desc:`Give this ticket to another captain to award ${policy.pointsPerTicket} Veteran Points.`,
    rank:1,use_type:0,thumbnail_id:"",effect:"",sell_price:0,collect_qty:0};
}
function numericIdentity(id:string):number|unknown {
  if(BigInt(id)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(id);
  const codec=JSON as typeof JSON&{rawJSON?:(raw:string)=>unknown};
  if(!codec.rawJSON)throw new TypeError("Exact numeric gift uint64 emission requires JSON.rawJSON");
  return codec.rawJSON(id);
}
/** The root authenticates both identities and admits an actual eligible other
 * local account. This planner never transfers a ticket or changes the sender's
 * VIP EXP. Native consumed_item_list reports removal DELTAS, not remain. */
export function planVeteranGift(payload:Record<string,unknown>,items:readonly VeteranGiftOwned[],recipientVipExp:number,policy:VeteranGiftPolicy) {
  policyValid(policy);
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new TypeError("Gift packet required");
  for(const key of ["inst_id","target_pvid","qty"]){
    const field=Object.getOwnPropertyDescriptor(payload,key);
    if(!field?.enumerable||!Object.hasOwn(field,"value"))throw new TypeError("Gift packet requires own data fields");
  }
  const selected=identity(payload.inst_id);identity(payload.target_pvid);
  const qty=positive(payload.qty),before=uint(recipientVipExp);
  if(!Array.isArray(items))throw new TypeError("Owned gift inventory required");
  const seen=new Set<string>();let index=-1;
  for(let i=0;i<items.length;i++) {
    const row=items[i],field=row&&Object.getOwnPropertyDescriptor(row,"inst_id");
    if(!row||typeof row!=="object"||Array.isArray(row)||!field||!Object.hasOwn(field,"value"))throw new TypeError("Owned gift identity required");
    const id=identity(row.inst_id);if(seen.has(id))throw new TypeError("Duplicate owned gift identity");seen.add(id);
    if(id===selected)index=i;
  }
  if(index<0)throw new TypeError("Owned GC6 ticket required");
  const item=items[index];
  if(item.ref_id!=="GC6"||item.lock!==0)throw new TypeError("Owned unlocked GC6 ticket required");
  const stock=uint(item.qty);if(stock<qty)throw new TypeError("Insufficient owned GC6 tickets");
  const next=BigInt(before)+BigInt(qty)*BigInt(policy.pointsPerTicket);
  if(next>BigInt(U32))throw new TypeError("Recipient Veteran EXP overflow");
  return {index,remaining:stock-qty,vip_exp:Number(next),receipt:{consumed_item_list:[{inst_id:numericIdentity(selected),qty}]}};
}
