import assert from "node:assert/strict";
import {createLocalGameState} from "../src/game.js";
import {cardInstance} from "../src/bootstrap.js";
import {planHunterOvercome,type HunterOvercomePolicy} from "../src/hunter-overcome.js";

const policy:HunterOvercomePolicy={effect:[1,2,3].map(cnt=>({cnt,hp_percent:cnt*7,atk_percent:cnt*8,def_percent:cnt*9})),
  src:[1,2,3].map(overcome_cnt=>({target_base_rank:3,overcome_cnt,card_required_rank:3,card_cnt:2,
    item_list:[{ref_id:"local_authored_overcome_stone",qty:3},{ref_id:"local_authored_overcome_stone",qty:2}],gold:123})),items:[]};
const refs=[{base:{id:"003",is_source:0},stat:[3,4,5].map(rank=>({rank,awk_step:0}))}];
function fixture() {
  const game=createLocalGameState();game.starter_cards=[{...cardInstance(1000001,"003",5),exp:234,overcome_cnt:0,regdate:123456,skill_1_level:7}];
  game.recruited_cards=[{...cardInstance(1000010,"003",3),lock:0},{...cardInstance(1000011,"003",4),lock:0},
    {...cardInstance(1000012,"002",2),lock:0}];game.leader_inst_id=1000001;
  game.decks=[{type:1,list:[1000001,0,0,0,0]},{type:6,list:[1000010,0,0,0,0]}];game.gold=1000;
  game.items=[{inst_id:"18446744073709551615",ref_id:"local_authored_overcome_stone",qty:2,lock:0},
    {inst_id:42,ref_id:"local_authored_overcome_stone",qty:3,lock:0},
    {inst_id:7,ref_id:"local_authored_overcome_stone",qty:0,lock:0},
    {inst_id:4,ref_id:"local_authored_overcome_stone",qty:100,lock:1},
    {inst_id:8,ref_id:"UNKNOWN_PRESERVED",qty:9,lock:0,private_extra:{kept:true}}] as any;
  return game;
}
const payload={target_inst_id:"1000001",src_inst_id_list:"[1000010,1000011]"};
const game=fixture(),before=structuredClone(game),plan=planHunterOvercome(payload,game,policy,refs,new Set([1000001]));
assert.deepEqual(game,before,"Planning never mutates the input, target, stock, decks or book");
assert.equal(plan.targetId,1000001);assert.equal(plan.previousCount,0);assert.equal(plan.overcome_cnt,1);assert.equal(plan.gold,877);
assert.deepEqual(plan.starter_cards,[{...before.starter_cards[0],overcome_cnt:1}]);assert.deepEqual(plan.recruited_cards,[before.recruited_cards[2]]);
assert.deepEqual(plan.decks,[before.decks[0],{type:6,list:[0,0,0,0,0]}]);assert.deepEqual(plan.receipt.removed_card,[1000010,1000011]);
assert.deepEqual(plan.receipt.target,{inst_id:1000001,overcome_cnt:1});assert.deepEqual(plan.receipt.user.gold,{prev:1000,cur:877});
assert.equal(plan.receipt.removed_item.length,2);assert.equal(plan.receipt.removed_item[0].inst_id,42);assert.equal(plan.receipt.removed_item[0].qty,3);
assert.match(JSON.stringify(plan.receipt.removed_item),/"inst_id":18446744073709551615,"qty":2/);
assert.deepEqual(plan.items.map(row=>row.qty),[0,0,0,100,9],"Lowest-ID unlocked stacks debit first; zero rows and locked/unrelated rows remain");
assert.equal(plan.receipt.dailyquest_min_stage,"");for(const key of ["achievement","daily_quest","linear_quest"] as const)assert.deepEqual(plan.receipt[key],[]);
assert.equal(Object.hasOwn(plan,"next_card_inst_id"),false);assert.equal(Object.hasOwn(plan,"card_book"),false);
assert.equal(Object.hasOwn(plan.receipt,"card"),false);assert.equal(Object.hasOwn(plan.receipt,"consumed_item_list"),false);
(plan.items[4] as any).private_extra.kept=false;assert.equal((game.items[4] as any).private_extra.kept,true,"Output unknown metadata is detached");
Object.assign(plan.starter_cards[0],{skill_1_level:999});assert.equal(game.starter_cards[0].skill_1_level,7);
const refuse=(change:(game:ReturnType<typeof fixture>)=>void,packet:Record<string,unknown>=payload,tables=policy,references=refs,protectedIds=new Set<number>())=>{
  const game=fixture();change(game);const snapshot=structuredClone(game);assert.throws(()=>planHunterOvercome(packet,game,tables,references,protectedIds));assert.deepEqual(game,snapshot);
};
for(const packet of [{...payload,target_inst_id:"01000001"},{...payload,target_inst_id:"18446744073709551615"},
  {...payload,target_inst_id:999},{...payload,src_inst_id_list:'["1000010",1000011]'},
  {...payload,src_inst_id_list:"[1000010,1000010]"},{...payload,src_inst_id_list:"[1000010,1000001]"},
  {...payload,src_inst_id_list:"[1000010]"},{...payload,src_inst_id_list:"[1000010,9007199254740993]"},
  {...payload,src_inst_id_list:"invalid"},{...payload,target_cnt:2},{...payload,price:0}])refuse(()=>{},packet);
refuse(game=>{game.starter_cards[0].awk_step=1;});refuse(game=>{game.starter_cards[0].awk_overcome=1;});
for(const rank of [3,4,5])refuse(game=>{game.starter_cards[0].rank=rank;game.starter_cards[0].overcome_cnt=rank-2;});
for(const key of ["awk_step","awk_overcome","overcome_cnt","lock"])refuse(game=>{game.recruited_cards[0][key]=1;});
refuse(game=>{game.recruited_cards[0].ref_id="002";});refuse(game=>{game.recruited_cards[0].rank=2;});
refuse(()=>{},payload,policy,refs,new Set([1000010]));refuse(game=>{game.recruited_cards.push({...game.recruited_cards[0]});});
refuse(game=>{game.gold=122;});refuse(game=>{game.gold=NaN;});refuse(game=>{game.items[0].qty=1;});
refuse(game=>{game.items[1].lock=1;});refuse(game=>{game.items.push({inst_id:"42",ref_id:"UNRELATED",qty:1,lock:0} as any);});
refuse(game=>{game.items[0].inst_id="018446744073709551615" as any;});
refuse(()=>{},payload,{...policy,src:[]});refuse(()=>{},payload,{...policy,effect:[]});
refuse(()=>{},payload,{...policy,src:[policy.src[0],policy.src[0]]});
refuse(()=>{},payload,{...policy,src:[{...policy.src[0],item_list:[{ref_id:"local_authored_overcome_stone",qty:0xffff_ffff},{ref_id:"local_authored_overcome_stone",qty:1}]}]});
refuse(()=>{},payload,policy,[{...refs[0],stat:[{rank:1,awk_step:0},...refs[0].stat]}]);
// An item-only configured step is the same combined-BOM contract, not an
// invented capacity endpoint. Its ordinary count still advances only once.
const materialOnly={...policy,src:[{...policy.src[0],card_required_rank:0,card_cnt:0}]};
const materialGame=fixture(),materialPlan=planHunterOvercome({...payload,src_inst_id_list:"[]"},materialGame,materialOnly,refs,new Set());
assert.equal(materialPlan.overcome_cnt,1);assert.deepEqual(materialPlan.receipt.removed_card,[]);assert.deepEqual(materialPlan.recruited_cards,materialGame.recruited_cards);
refuse(()=>{},{...payload,src_inst_id_list:[]},{...policy,src:[{...policy.src[0],card_cnt:0,card_required_rank:0,gold:0,item_list:[]}]});
// Later configured steps select next count, not material count or a default
// multiplier. All retained target fields remain exact, with no stat preapply.
const later=fixture();later.starter_cards[0].overcome_cnt=2;
assert.equal(planHunterOvercome(payload,later,policy,refs,new Set()).overcome_cnt,3);
console.log("Hunter Overcome planner: explicit combined BOM/effect gate, first reference rank/next count, ordinary cap and same-ref protected sources, exact full64 deterministic material deltas, zero rows, detached transition and unchanged input passed; numeric policies authored LOCAL");
