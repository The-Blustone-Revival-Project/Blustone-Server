import {QUEST_CURRENCY_FIELDS,questRewardIdentity,type QuestReference,type DailyQuestInstance} from "./quest-contracts.js";

export interface LocalQuestRule {id:string;event:"mission-win";stage_id:string|null}
export interface LocalLinearDefinition {references:QuestReference[];rules:LocalQuestRule[]}
export interface LocalLinearJournal extends LocalLinearDefinition {index:number;cur_val:number}
export interface LocalQuestJournal {period_id:string;minimum_stage:string;references:QuestReference[];rules:LocalQuestRule[];instances:DailyQuestInstance[];seen:string[];linear?:LocalLinearJournal}
export interface LocalQuestPolicy {period_id:string;minimum_stage:string;references:QuestReference[];rules:LocalQuestRule[];owners:Record<string,DailyQuestInstance[]>;linear?:LocalLinearDefinition}
function object(raw:unknown,keys:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||
    keys.some(key=>!Object.hasOwn(raw,key))||Reflect.ownKeys(raw).some(key=>typeof key!=="string"||![...keys,...optional].includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))throw new TypeError("Local quest requires complete plain data fields");
  return raw as Record<string,unknown>;
}
function array(raw:unknown,max:number):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,"value")))throw new TypeError("Local quest requires dense bounded data array");return raw;
}
function text(raw:unknown,nonempty=false):string {
  if(typeof raw!=="string"||nonempty&&!raw||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("Local quest requires lossless text");return raw;
}
function uint(raw:unknown):number {if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("Local quest requires uint32");return raw;}
function definitions(raw:unknown,stages:ReadonlySet<string>,type=2) {
  const row=object(raw,["period_id","minimum_stage","references","rules"]),period_id=text(row.period_id,true),minimum_stage=text(row.minimum_stage);
  if(period_id.length>128||!stages.has(minimum_stage))throw new TypeError("Unknown fixed quest period/minimum stage");
  const ids=new Set<string>();let targets=0;
  const references=array(row.references,32).map(value=>{
    const ref=object(value,["id","type","title","desc","desc_noti","npc_id","go_to","serial","target_val","option_val","reward"]);
    const id=text(ref.id,true),target_val=uint(ref.target_val);
    if(!id.startsWith("local_")||id.length>128||ids.has(id)||ref.type!==type||!target_val||target_val>10000)throw new TypeError("Quest requires unique declared local typed identity and positive bounded target");
    ids.add(id);targets+=target_val;
    const rewardRaw=object(ref.reward,[...QUEST_CURRENCY_FIELDS,"item_list","card_list"]);
    array(rewardRaw.item_list,0);array(rewardRaw.card_list,0);const reward=questRewardIdentity(rewardRaw);
    if(QUEST_CURRENCY_FIELDS.some(key=>key!=="gold"&&reward[key]!==0))throw new TypeError("Local daily quest supports supplied gold only");
    return {id,type,title:text(ref.title),desc:text(ref.desc),desc_noti:text(ref.desc_noti),npc_id:text(ref.npc_id),go_to:text(ref.go_to),
      serial:uint(ref.serial),target_val,option_val:uint(ref.option_val),reward};
  });
  if(!references.length||targets>10000)throw new TypeError("Local quest period supports1..32 quests and at most10000 total target steps");
  const rules=array(row.rules,32).map(value=>{
    const rule=object(value,["id","event","stage_id"]),id=text(rule.id,true);
    if(!ids.has(id)||rule.event!=="mission-win"||rule.stage_id!==null&&(typeof rule.stage_id!=="string"||!stages.has(rule.stage_id)))throw new TypeError("Unknown local quest event/stage mapping");
    return {id,event:"mission-win" as const,stage_id:rule.stage_id as string|null};
  });
  if(new Set(rules.map(row=>row.id)).size!==rules.length)throw new TypeError("Duplicate local quest event rule");
  return {period_id,minimum_stage,references,rules};
}
function linearDefinition(raw:unknown,base:ReturnType<typeof definitions>,stages:ReadonlySet<string>,journal=false):LocalLinearDefinition {
  const row=object(raw,["references","rules",...(journal?["index","cur_val"]:[])]);
  const parsed=definitions({period_id:base.period_id,minimum_stage:base.minimum_stage,references:row.references,rules:row.rules},stages,3);
  const all=[...base.references,...parsed.references];
  if(new Set(all.map(row=>row.id)).size!==all.length||all.reduce((sum,row)=>sum+row.target_val,0)>10000||
    parsed.rules.length!==parsed.references.length||parsed.references.some((row,i)=>!row.serial||i>0&&row.serial<=parsed.references[i-1].serial))throw new TypeError("Linear quest sequence identities/serials/rules/combined targets invalid");
  return {references:parsed.references,rules:parsed.rules};
}
/** Internal preview objects remain structured; native reference/linear wire
 * consumers strictly convert reward to STRING then JSON::parse it. */
export function localQuestReferenceWire(reference:QuestReference) {return {...structuredClone(reference),reward:JSON.stringify(reference.reward)};}
function linearWire(journal:LocalQuestJournal) {
  const linear=journal.linear;if(!linear)return [];
  const current=linear.references[linear.index];
  if(current)return [{...localQuestReferenceWire(current),cur_val:linear.cur_val}];
  return [{title:"",desc:"",id:"",npc_id:"",go_to:"",serial:0,target_val:0,option_val:0,cur_val:0,
    reward:JSON.stringify({...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]})}];
}
function instances(raw:unknown,refs:readonly QuestReference[]):DailyQuestInstance[] {
  const rows=array(raw,32).map(value=>{
    const row=object(value,["daily_quest_id","is_rewarded","cur_val"]),id=text(row.daily_quest_id,true),is_rewarded=uint(row.is_rewarded),cur_val=uint(row.cur_val);
    const ref=refs.find(row=>row.id===id);if(!ref||is_rewarded>1||is_rewarded===1&&cur_val<ref.target_val)throw new TypeError("Malformed owned quest progress/claim");
    return {daily_quest_id:id,is_rewarded,cur_val};
  });
  if(rows.length!==refs.length||new Set(rows.map(row=>row.daily_quest_id)).size!==rows.length)throw new TypeError("Complete unique local quest instances required");return rows;
}
export function localQuestPolicy(raw:unknown,stages:ReadonlySet<string>):LocalQuestPolicy {
  const row=object(raw,["period_id","minimum_stage","references","rules","owners"],["linear"]),base=definitions(Object.fromEntries(["period_id","minimum_stage","references","rules"].map(key=>[key,row[key]])),stages);
  const rawOwners=row.owners;if(!rawOwners||typeof rawOwners!=="object"||Array.isArray(rawOwners)||Object.getPrototypeOf(rawOwners)!==Object.prototype)throw new TypeError("Explicit local quest owner map required");
  if(Reflect.ownKeys(rawOwners).some(key=>typeof key!=="string"||!Object.getOwnPropertyDescriptor(rawOwners,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(rawOwners,key)!,"value")))throw new TypeError("Quest owners require data descriptors");
  const owners=Object.fromEntries(Object.entries(rawOwners).map(([id,value])=>{
    if(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id)))throw new TypeError("Local quest owner unavailable");return [id,instances(value,base.references)];
  }));return {...base,owners,...(Object.hasOwn(row,"linear")?{linear:linearDefinition(row.linear,base,stages)}:{})};
}
export function localQuestJournal(raw:unknown,stages:ReadonlySet<string>):LocalQuestJournal {
  const row=object(raw,["period_id","minimum_stage","references","rules","instances","seen"],["linear"]),base=definitions(Object.fromEntries(["period_id","minimum_stage","references","rules"].map(key=>[key,row[key]])),stages);
  const seen=array(row.seen,10000).map(value=>text(value,true));if(new Set(seen).size!==seen.length||seen.some(id=>id.length>256))throw new TypeError("Malformed local quest event history");
  let linear:LocalLinearJournal|undefined;
  if(Object.hasOwn(row,"linear")) {
    const parsed=linearDefinition(row.linear,base,stages,true),data=row.linear as Record<string,unknown>,index=uint(data.index),cur_val=uint(data.cur_val);
    if(index>parsed.references.length||index===parsed.references.length&&cur_val!==0||index<parsed.references.length&&cur_val>parsed.references[index].target_val||
      parsed.references.slice(0,index).reduce((sum,row)=>sum+row.target_val,cur_val)>seen.length)throw new TypeError("Linear earned sequence state inconsistent");
    linear={...parsed,index,cur_val};
  }
  return {...base,instances:instances(row.instances,base.references),seen,...(linear?{linear}:{})};
}
export function beginLocalQuests(policy:LocalQuestPolicy,pvid:number):LocalQuestJournal|undefined {
  const rows=policy.owners[String(pvid)];if(!rows)return undefined;
  const {owners,linear,...base}=policy;return structuredClone({...base,instances:rows,seen:[],...(linear?{linear:{...linear,index:0,cur_val:0}}:{})});
}
export function localQuestProgress(journal:LocalQuestJournal) {return {dailyquest_min_stage:journal.minimum_stage,daily_quest:structuredClone(journal.instances),linear_quest:linearWire(journal)};}
/** Declared LOCAL event: only a matching settled ordinary mission's explicit
 * native clear1 may call this planner. Snapshot battle ID, never target input. */
export function recordLocalQuestWin(journal:LocalQuestJournal,id:string,stage:string):LocalQuestJournal {
  if(journal.seen.includes(id))return journal;
  const next=structuredClone(journal);let changed=false;
  for(const rule of next.rules)if(rule.stage_id===null||rule.stage_id===stage) {
    const row=next.instances.find(row=>row.daily_quest_id===rule.id)!,ref=next.references.find(row=>row.id===rule.id)!;
    if(!row.is_rewarded&&row.cur_val<ref.target_val){row.cur_val++;changed=true;}
  }
  const linear=next.linear,current=linear?.references[linear.index],rule=current&&linear?.rules.find(row=>row.id===current.id);
  if(linear&&current&&rule&&(rule.stage_id===null||rule.stage_id===stage)&&linear.cur_val<current.target_val){linear.cur_val++;changed=true;}
  if(!changed)return journal;
  if(!id||id.length>256||next.seen.length>=10000)throw new TypeError("Local quest event history unavailable");next.seen.push(id);return next;
}
export function planLocalQuestClaim(journal:LocalQuestJournal,gold:number,id:unknown,target:unknown) {
  if(typeof target==="string"&&/^(?:0|[1-9]\d*)$/.test(target))target=Number(target);
  const ref=journal.references.find(row=>row.id===id),row=journal.instances.find(row=>row.daily_quest_id===id);
  if(!ref||!row||target!==ref.target_val||row.cur_val<ref.target_val)throw new TypeError("Local quest identity/target or earned progress unavailable");
  const next=structuredClone(journal),cur=uint(uint(gold)+(row.is_rewarded?0:ref.reward.gold));
  next.instances.find(row=>row.daily_quest_id===id)!.is_rewarded=1;
  return {journal:next,gold:cur,replay:row.is_rewarded===1,receipt:{...localQuestProgress(next),reward:{gold:{cur}}}};
}
export function planLocalLinearClaim(journal:LocalQuestJournal,gold:number,id:unknown,serial:unknown,target:unknown) {
  const parse=(raw:unknown)=>typeof raw==="string"&&/^(?:0|[1-9]\d*)$/.test(raw)?Number(raw):typeof raw==="number"?raw:NaN;
  serial=parse(serial);target=parse(target);
  const linear=journal.linear,index=linear?.references.findIndex(row=>row.id===id&&row.serial===serial&&row.target_val===target)??-1;
  if(!linear||index<0||index>linear.index||index===linear.index&&linear.cur_val<linear.references[index].target_val)throw new TypeError("Linear quest identity/serial/target or earned progress unavailable");
  const replay=index<linear.index,next=structuredClone(journal),cur=uint(uint(gold)+(replay?0:linear.references[index].reward.gold));
  if(!replay){next.linear!.index++;next.linear!.cur_val=0;}
  return {journal:next,gold:cur,replay,receipt:{...localQuestProgress(next),reward:{gold:{cur}}}};
}
