/** Source ReqSyncItemInstance sends item reference strings; these are not
 * instance IDs. Quotas and strict canonical storage admission are LOCAL. */
export const LOCAL_ITEM_SYNC_MAX=1024;
export interface ItemSyncOwned {
  inst_id:number|string;ref_id:string;qty:number;buy_cnt_gold?:number;buy_cnt_manda?:number;
}
function text(raw:unknown):string {
  if(typeof raw!=="string"||!raw||Buffer.from(raw,"utf8").toString("utf8")!==raw)
    throw new TypeError("Item sync requires nonempty lossless reference strings");
  return raw;
}
function dense(raw:unknown,max:number):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,"value")))
    throw new TypeError("Item sync requires a bounded dense plain array");
  return raw;
}
export function itemSyncRefs(raw:unknown):string[] {
  if(typeof raw==="string") {
    if(raw.length>32768)throw new TypeError("Item sync reference text exceeds local length limit");
    try{raw=JSON.parse(raw);}catch{throw new TypeError("Item sync references require a JSON string array");}
  }
  return [...new Set(dense(raw,LOCAL_ITEM_SYNC_MAX).map(text))];
}
function identity(raw:unknown):string {
  const id=typeof raw==="number"&&Number.isSafeInteger(raw)&&raw>0?String(raw):typeof raw==="string"?raw:"";
  if(!/^[1-9]\d*$/.test(id)||BigInt(id)>0xffff_ffff_ffff_ffffn)
    throw new TypeError("Item sync owned identity requires exact positive uint64");
  return id;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)
    throw new TypeError("Item sync quantity/counter requires uint32");
  return raw;
}
/** Native E0 callback uses SetItem to upsert absolute full instances. Return
 * every matching owned stack, including zero quantity; absent rows do not
 * delete stale native instances. Unknown unowned refs create no zero-ID row.
 * Reference publication is required only for rows actually returned. */
export function syncOwnedItems(raw:unknown,owned:readonly ItemSyncOwned[],knownRefs:ReadonlySet<string>) {
  const requested=itemSyncRefs(raw),seen=new Set<string>(),rows=new Map<string,ItemSyncOwned[]>();
  for(const row of owned) {
    if(!row||typeof row!=="object"||Array.isArray(row)||Object.getPrototypeOf(row)!==Object.prototype||
      ["inst_id","ref_id","qty"].some(key=>!Object.hasOwn(row,key))||
      Reflect.ownKeys(row).some(key=>typeof key!=="string"||!Object.getOwnPropertyDescriptor(row,key)?.enumerable||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(row,key)!,"value")))
      throw new TypeError("Item sync owned rows require plain own data fields");
    const id=identity(row.inst_id),ref=text(row.ref_id);
    if(seen.has(id))throw new TypeError("Item sync owned identity is duplicated");seen.add(id);
    uint(row.qty);
    for(const field of ["buy_cnt_gold","buy_cnt_manda"] as const)if(Object.hasOwn(row,field))uint(row[field]);
    const group=rows.get(ref)??[];group.push(row);rows.set(ref,group);
  }
  const item:Record<string,unknown>[]=[];
  for(const ref of requested)for(const source of rows.get(ref)??[]) {
    if(!knownRefs.has(ref))throw new TypeError("Item sync returned reference is not published");
    const row=structuredClone(source) as unknown as Record<string,unknown>,id=identity(source.inst_id);
    if(BigInt(id)<=BigInt(Number.MAX_SAFE_INTEGER))row.inst_id=Number(id);
    else {
      const codec=JSON as typeof JSON&{rawJSON?:(text:string)=>unknown};
      if(!codec.rawJSON)throw new TypeError("Exact item sync numeric uint64 emission requires JSON.rawJSON support");
      row.inst_id=codec.rawJSON(id);
    }
    item.push(row);
  }
  return {item};
}
