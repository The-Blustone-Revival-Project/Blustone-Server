import type {LocalCardInstance} from "./game.js";
import {parseGemInstances,type GemReference} from "./gem-instances.js";
import {parseGemMountRequest} from "./gem-mount.js";
import {gemRemovalPrices,gemRemovalPriceAt,type GemRemovalPrice} from "./gem-removal-prices.js";
const equipment=["weapon","armor","accessory"] as const;
/** Configured gold2 six-cell replacement. A changed OLD occupied cell incurs
 * its OLD Gem level fee, including swaps. Cross-Hunter moves and type4 refuse.
 * Pure preparation only: caller owns authenticated atomic wallet/persistence. */
export function planPaidGemMount(raw:unknown,cards:readonly LocalCardInstance[],gems:readonly Record<string,unknown>[],
  refs:readonly GemReference[],busy:ReadonlySet<number>,prices:readonly GemRemovalPrice[],gold:number) {
  try {
    const quotes=gemRemovalPrices({result_code:1,ret_data:prices}),request=parseGemMountRequest(raw);
    const targets=cards.filter(card=>String(card.inst_id)===request.target);
    if(targets.length!==1) throw new TypeError("Gem target is not uniquely owned");
    const target=targets[0];
    if(busy.has(target.inst_id)||(target.mirage_remain_hp!==undefined&&Number(target.mirage_remain_hp)!==1000))
      throw new TypeError("Gem target has active combat commitments");
    if(!Number.isSafeInteger(gold)||gold<0) throw new TypeError("Invalid Gem gold balance");
    const rank=(id:string,slot:number)=>Number(cards.find(card=>String(card.inst_id)===id)?.[`${equipment[slot]}_rank`]);
    const parsed=parseGemInstances({result_code:1,ret_data:gems},refs,new Set(cards.map(card=>String(card.inst_id))),rank);
    const byId=new Map(parsed.map(gem=>[gem.inst_id,gem])),refById=new Map(refs.map(ref=>[ref.id,ref]));
    const before=equipment.map(()=>["0","0"]);
    for(const gem of parsed.filter(gem=>gem.target_inst_id===request.target)) before[refById.get(gem.ref_id)!.target-1][gem.position-1]=gem.inst_id;
    let fee=0,removedCells=0;
    const desired=new Map<string,number>();
    for(let slot=0;slot<3;slot++) for(let column=0;column<2;column++) {
      const old=before[slot][column],next=request.grids[slot][column];
      if(old!==next&&old!=="0") {
        const quote=gemRemovalPriceAt(quotes,byId.get(old)!.level,2);
        if(!quote) throw new TypeError("Changed occupied Gem cell has missing removal fee");
        fee+=quote.price;removedCells++;
        // Native popup ADD32 wraps. Replica refuses wrapped/undercharged totals.
        if(fee>0xffff_ffff) throw new TypeError("Gem removal fee total exceeds native uint32");
      }
      if(next==="0") continue;
      const gem=byId.get(next),ref=gem&&refById.get(gem.ref_id);
      if(!gem||!ref) throw new TypeError("Desired Gem is not owned/referenced");
      if(ref.target-1!==slot) throw new TypeError("Gem does not match requested equipment part");
      if(gem.target_inst_id!=="0"&&gem.target_inst_id!==request.target) throw new TypeError("Cross-Hunter Gem workflow is not reconstructed");
      if(!Number.isInteger(rank(request.target,slot))||rank(request.target,slot)<1||(column===1&&rank(request.target,slot)<3))
        throw new TypeError("Desired Gem equipment position is locked");
      desired.set(next,column+1);
    }
    if(gold<fee) throw new TypeError("Insufficient gold for Gem removal");
    let changed=0;
    const next=gems.map((wire,index)=>{
      const gem=parsed[index],position=desired.get(gem.inst_id);
      const selected=position!==undefined,newTarget=selected?request.target:gem.target_inst_id===request.target?"0":gem.target_inst_id;
      const newPosition=selected?position:newTarget==="0"&&gem.target_inst_id===request.target?0:gem.position;
      if(newTarget===gem.target_inst_id&&newPosition===gem.position) return structuredClone(wire);
      changed++;return {...structuredClone(wire),target_inst_id:newTarget,position:newPosition};
    });
    // Echo all owned rows, including on no-write retries. After a removal whose
    // response was lost, removed rows no longer belong to the requested target:
    // a target-only echo cannot repair their stale mounted client state.
    const receipt=next.map(row=>structuredClone(row));
    return {next,receipt,changed,removedCells,fee,gold:gold-fee};
  } catch(error) {return {error:error instanceof Error?error.message:"Invalid Gem replacement"};}
}
