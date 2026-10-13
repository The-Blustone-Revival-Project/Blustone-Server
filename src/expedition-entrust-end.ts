/** Complete nonnull End result component only. Generic ret_data.user and
 * achievement are independent contracts, not inferred by this decoder. */
export interface EntrustEndResult {
  gold:{prev:number;cur:number};
  user_exp:{prev:number;cur:number;max_ap:{prev:number;cur:number};ap:{cur:number;ap_charge_time:number}};
  card_exp:{inst_id:string;prev:number;cur:number}[];
  item:{inst_id:string;ref_id:string;added:number}[];
}
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw))||
    keys.some(key=>!Object.hasOwn(raw,key))||Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
    throw new TypeError("Incomplete or unsupported Entrust End result fields");
  return raw as Record<string,unknown>;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("Entrust End requires exact uint32");return raw;
}
function serial(raw:unknown):string {
  const value=typeof raw==="string"?raw:typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):"";
  if(!/^(?:0|[1-9]\d*)$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)throw new TypeError("Entrust End identity requires exact64");return value;
}
function text(raw:unknown):string {
  if(typeof raw!=="string"||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("Entrust End requires lossless reference string");return raw;
}
function array(raw:unknown):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||Reflect.ownKeys(raw).some(key=>key!=="length"&&
    (typeof key!=="string"||!/^(?:0|[1-9]\d*)$/.test(key)||Number(key)>=raw.length)))throw new TypeError("Entrust End requires JSON array");
  for(let i=0;i<raw.length;i++)if(!Object.hasOwn(raw,i)||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,String(i))!,"value"))throw new TypeError("Entrust End requires dense data array");return raw;
}
function pair(raw:unknown) {const value=object(raw,["prev","cur"]);return {prev:uint(value.prev),cur:uint(value.cur)};}
/** Snapshots are absolute; item added is an inventory delta, unlike Start's
 * encoded string occurrence previews. Require full AP parents even though
 * native missing fields can zero them. No ownership/awards/level-ups generated. */
export function parseEntrustEndResult(raw:unknown):EntrustEndResult {
  const result=object(raw,["gold","user_exp","card_exp","item"]);
  const exp=object(result.user_exp,["prev","cur","max_ap","ap"]),ap=object(exp.ap,["cur","ap_charge_time"]);
  return {gold:pair(result.gold),user_exp:{prev:uint(exp.prev),cur:uint(exp.cur),max_ap:pair(exp.max_ap),
    ap:{cur:uint(ap.cur),ap_charge_time:uint(ap.ap_charge_time)}},
    card_exp:array(result.card_exp).map(raw=>{const row=object(raw,["inst_id","prev","cur"]);return {inst_id:serial(row.inst_id),prev:uint(row.prev),cur:uint(row.cur)};}),
    item:array(result.item).map(raw=>{const row=object(raw,["inst_id","ref_id","added"]);return {inst_id:serial(row.inst_id),ref_id:text(row.ref_id),added:uint(row.added)};})};
}
/** Preserve capture integer tokens before rounding. Model decimal strings do
 * not emulate legacy native wire string/double identity coercions. */
export function parseEntrustEndResultJson(source:string):EntrustEndResult {
  return parseEntrustEndResult(JSON.parse(source,function(key,value,context?:{source:string}){
    if(key==="inst_id"&&typeof value==="number"&&!Number.isSafeInteger(value)){
      if(!context?.source||!/^(?:0|[1-9]\d*)$/.test(context.source))throw new TypeError("Unrecoverable Entrust End identity token");return context.source;
    }return value;
  }));
}
