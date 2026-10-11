import type {LocalCardInstance} from "./game.js";
import {parseGemInstances,type GemReference} from "./gem-instances.js";
const parts=["weapons","armors","accessories"] as const;
const equipment=["weapon","armor","accessory"] as const;
function serial(value:unknown,zero=false):string {
  const text=typeof value==="number"&&Number.isSafeInteger(value)?String(value):value;
  if(typeof text!=="string"||! /^(?:0|[1-9]\d*)$/.test(text)||(!zero&&text==="0")||BigInt(text)>0xffff_ffff_ffff_ffffn)
    throw new TypeError("Invalid Gem mount uint64 identity");
  return text;
}
export function parseGemMountRequest(raw:unknown) {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Invalid Gem mount request");
  const row=raw as Record<string,unknown>,target=serial(row.target_inst_id);
  if(row.price_type!==2&&row.price_type!=="2") throw new TypeError("Gem mount supports recovered gold2 choice only");
  const value=typeof row.combination==="string"?JSON.parse(row.combination,(_key,value,context?:{source:string})=>{
    if(typeof value!=="number") return value;
    if(context?.source && /^(?:0|[1-9]\d*)$/.test(context.source)) return context.source;
    return serial(value,true); // Older runtimes reject unsafe decoded numbers.
  }):row.combination;
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join(",")!=="accessories,armors,weapons")
    throw new TypeError("Gem combination requires three exact plural equipment arrays");
  const grids=parts.map(part=>{
    const cells=value[part];
    if(!Array.isArray(cells)||cells.length!==2) throw new TypeError("Gem combination requires two ordered positions per part");
    return cells.map(id=>serial(id,true));
  });
  const used=grids.flat().filter(id=>id!=="0");
  if(new Set(used).size!==used.length) throw new TypeError("Gem cannot occupy two desired positions");
  return {target,grids};
}
/** Proven free first-install/unchanged path. Replacing a changed occupied cell
 * needs its original removal price; no zero-price substitute is provided. */
export function planFreeGemMount(raw:unknown,cards:readonly LocalCardInstance[],gems:readonly Record<string,unknown>[],
  refs:readonly GemReference[],busy:ReadonlySet<number>) {
  try {
    const request=parseGemMountRequest(raw),matches=cards.filter(card=>String(card.inst_id)===request.target);
    if(matches.length!==1) throw new TypeError("Gem target is not uniquely owned");
    const target=matches[0];
    if(busy.has(target.inst_id)||(target.mirage_remain_hp!==undefined&&Number(target.mirage_remain_hp)!==1000))
      throw new TypeError("Gem target has active combat commitments");
    const rank=(id:string,slot:number)=>Number(cards.find(card=>String(card.inst_id)===id)?.[`${equipment[slot]}_rank`]);
    const parsed=parseGemInstances({result_code:1,ret_data:gems},refs,new Set(cards.map(card=>String(card.inst_id))),rank);
    const byId=new Map(parsed.map(gem=>[gem.inst_id,gem]));
    const before=parts.map(()=>["0","0"]);
    for(const gem of parsed.filter(gem=>gem.target_inst_id===request.target)) {
      const ref=refs.find(ref=>ref.id===gem.ref_id)!;
      before[ref.target-1][gem.position-1]=gem.inst_id;
    }
    const changed=new Map<string,{position:number}>();
    for(let slot=0;slot<3;slot++) for(let index=0;index<2;index++) {
      const old=before[slot][index],next=request.grids[slot][index];
      if(old===next) continue;
      if(old!=="0") throw new TypeError("Changed occupied Gem cell requires unconfigured removal fee");
      if(next==="0") continue;
      const gem=byId.get(next),ref=gem&&refs.find(ref=>ref.id===gem.ref_id);
      if(!gem||!ref) throw new TypeError("Desired Gem is not owned/referenced");
      if(ref.target-1!==slot) throw new TypeError("Gem does not match requested equipment part");
      if(gem.target_inst_id!=="0") throw new TypeError("Cross-Hunter/moved Gem workflow is not reconstructed");
      if(!Number.isInteger(rank(request.target,slot))||rank(request.target,slot)<1||(index===1&&rank(request.target,slot)<3))
        throw new TypeError("Desired Gem equipment position is locked");
      changed.set(next,{position:index+1});
    }
    const next=gems.map((gem,index)=>changed.has(parsed[index].inst_id)?
      {...structuredClone(gem),target_inst_id:request.target,position:changed.get(parsed[index].inst_id)!.position}:structuredClone(gem));
    // Echo all authoritative gems on this target even for a no-write retry:
    // native updates only returned known rows, so [] would leave a client that
    // lost the first response stale until a separate inventory refresh.
    const receipt=next.filter(gem=>String(gem.target_inst_id)===request.target);
    return {next,receipt,changed:changed.size};
  } catch(error) {return {error:error instanceof Error?error.message:"Invalid Gem mount"};}
}
