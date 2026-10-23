import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
export const polishRefs=[{id:"LOCAL_SUPPLIED_GEM",name:"Supplied test Gem",desc:"Authored, not original rolls",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1 as const}];
export const polishPrices=[2,3].map(level=>({level,price_type:2,price:level===2?10:15,possibility:0.123,failed_compensation:0.456,add_sub_ability:0 as const}));
export function suppliedGem(level=1,failed=0,hp="100") {
  const stats={rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),hp};
  const abilities={level_up_failed:failed,main:stats,sub:level>1?[{...stats,hp:"0",atk:"25"}]:[]};
  return {ref_id:polishRefs[0].id,inst_id:"18446744073709551615",rank:1,level,position:0,target_inst_id:"0",ability:JSON.stringify(abilities),abilities};
}
export function polishPolicy(pvid:number) {
  const states=[suppliedGem(),suppliedGem(1,1),suppliedGem(1,2),suppliedGem(2,0,"250"),suppliedGem(3,0,"400")];
  return {classification:"local-supplied-sequence",owners:{[pvid]:[{inst_id:states[0].inst_id,
    steps:states.slice(1).map((after,i)=>({before:states[i],after}))}]}};
}
