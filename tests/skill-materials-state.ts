import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

const recipe=(role:number,level:number)=>({role,level,
  source_1_ref_id:level===2?"AIRSHIP_TICKET":"",source_1_qty:level===2?2:0,
  source_2_ref_id:level===3?"AIRSHIP_TICKET":"",source_2_qty:level===3?2:0,
  source_3_ref_id:level===2?"AIRSHIP_TICKET":"",source_3_qty:level===2?1:0,
  source_4_ref_id:"",source_4_qty:0});
// Module-global reference configuration must precede every bootstrap import.
process.env.BLUSTONE_SKILL_GOLD_PROFILE="legacy";
process.env.BLUSTONE_SKILL_MATERIAL_PRICES_JSON=JSON.stringify([1,2,3,4].flatMap(role=>[recipe(role,2),recipe(role,3)]));
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const {skillLevelRows}=await import("../src/skill-training.js");
const oldNow=Date.now;Date.now=()=>1_800_000_000_000;
const directory=mkdtempSync(path.join(tmpdir(),"blustone-skill-materials-state-"));
try {
  const file=path.join(directory,"state.json"),options={legacyCardIds:true};
  const initial=new ServerState("http://localhost",file,options);
  const actor=initial.registerGuest({device_id:"material-actor"},{}).ret_data as any;
  const peer=initial.registerGuest({device_id:"material-peer"},{}).ret_data as any;
  assert.equal(initial.gameFor(initial.accountFor(actor,{})).items.some(item=>item.ref_id==="AIRSHIP_TICKET"),false,"Recipe publication never grants materials");
  const saved=JSON.parse(readFileSync(file,"utf8"));
  const seeded=saved.gameStates.find(([id]:[number])=>id===actor.pvid)[1];
  const peerBefore=structuredClone(saved.gameStates.find(([id]:[number])=>id===peer.pvid)[1]);
  const seedTarget=seeded.starter_cards.find((card:any)=>card.inst_id===2);
  seedTarget.rank=2;seedTarget.skill_1_level=1;seedTarget.skill_2_level=1;seeded.gold=10000;
  const firstId=0x1_0000_0002,secondId=0x1_0000_0005;
  seeded.items=[{inst_id:secondId,ref_id:"AIRSHIP_TICKET",qty:20,lock:0},
    {inst_id:1,ref_id:"AIRSHIP_TICKET",qty:999,lock:1},
    {inst_id:firstId,ref_id:"AIRSHIP_TICKET",qty:2,lock:0},
    {inst_id:42,ref_id:"unrelated-imported-item",qty:7,lock:1}];
  writeFileSync(file,JSON.stringify(saved));
  const state=new ServerState("http://localhost",file,options);
  const game=state.gameFor(state.accountFor(actor,{}));
  const target=game.starter_cards.find(card=>card.inst_id===2)!;
  const rows=(gameResponse(state,"/reference/GetLevel",{}) as any).ret_data.skill;
  assert.equal(rows.length,200);assert.deepEqual(rows,skillLevelRows);
  for(const role of [1,2,3,4])for(const level of [2,3]) {
    const row:Record<string,unknown>|undefined=rows.find((entry:any)=>entry.role===role&&entry.level===level) as unknown as Record<string,unknown>|undefined;
    assert.ok(row);
    for(const [key,value] of Object.entries(recipe(role,level)))assert.equal(row[key],value);
  }
  const single={...actor,target_inst_id:"2",skill_idx:"1"};
  const multi={...actor,target_inst_id:"2",mulit_skill_up_count:"[2,2,0,0,0]"};
  const one=gameResponse(state,"/gym/SkillUp",single) as any;
  assert.equal(one.result_code,1);
  assert.deepEqual(one.ret_data.consumed_inst_list,[{inst_id:firstId,qty:2},{inst_id:secondId,qty:1}],"Duplicate recipe slots aggregate and split by ascending full instance ID");
  assert.deepEqual(one.ret_data.user.gold,{prev:10000,cur:9800});
  assert.equal(target.skill_1_level,2);
  assert.equal(game.items.find(item=>item.inst_id===firstId)?.qty,0,"Native quantity setters retain exhausted stack identity");
  assert.equal(game.items.find(item=>item.inst_id===secondId)?.qty,19);
  const two=gameResponse(state,"/gym/MultiSkillUp",multi) as any;
  assert.equal(two.result_code,1);
  assert.deepEqual(two.ret_data.consumed_inst_list,[{inst_id:secondId,remain:12}],"Across-level and across-skill costs aggregate; multi receipt is absolute remain, never qty");
  assert.deepEqual(two.ret_data.user.gold,{prev:9800,cur:8600});
  assert.deepEqual(two.ret_data.target_inst,{inst_id:2,skill_1_level:{cur:4},skill_2_level:{cur:3}});
  assert.equal(game.items.find(item=>item.inst_id===1)?.qty,999,"Locked stock cannot fund recipes");
  assert.deepEqual(game.items.find(item=>item.inst_id===42),seeded.items[3]);
  const settledItems=game.items,durable=readFileSync(file),settled=structuredClone(game);

  // Rewind only temporary target fields to exercise configured prices again.
  target.skill_1_level=1;target.skill_2_level=1;
  const baseline=structuredClone(game),roster=game.starter_cards;
  for(const invalid of [
    [...settledItems,{...settledItems[0]}],
    settledItems.map(item=>item.inst_id===secondId?{...item,qty:-1}:item),
    settledItems.map(item=>item.inst_id===secondId?{...item,qty:1.5}:item),
    settledItems.map(item=>item.inst_id===secondId?{...item,lock:2}:item),
    settledItems.map(item=>item.ref_id==="AIRSHIP_TICKET"?{...item,lock:1}:item),
  ]) {
    game.items=invalid;const before=structuredClone(game);
    assert.equal(gameResponse(state,"/gym/SkillUp",single).result_code,2001);
    assert.equal(gameResponse(state,"/gym/MultiSkillUp",multi).result_code,2001);
    assert.deepEqual(game,before);assert.equal(game.items,invalid);assert.deepEqual(readFileSync(file),durable);
  }
  game.items=settledItems;
  game.items=settledItems.map(item=>item.inst_id===secondId?{...item,qty:3}:item);
  const aggregateShortage=structuredClone(game),shortageItems=game.items;
  assert.equal(gameResponse(state,"/gym/MultiSkillUp",multi).result_code,2001,"Stock sufficient for the first destination cannot fund the entire two-skill batch");
  assert.deepEqual(game,aggregateShortage);assert.equal(game.items,shortageItems);assert.deepEqual(readFileSync(file),durable);
  game.items=settledItems;
  for(const [route,body] of [["/gym/SkillUp",single],["/gym/MultiSkillUp",multi]] as const) {
    const itemRows=[...game.items];
    mkdirSync(file+".tmp");
    try{assert.throws(()=>gameResponse(state,route,body),/EISDIR|EPERM|EACCES|illegal operation/);}
    finally{rmdirSync(file+".tmp");}
    assert.deepEqual(game,baseline);assert.equal(game.items,settledItems);assert.equal(game.starter_cards,roster);
    itemRows.forEach((item,index)=>assert.equal(game.items[index],item));
    assert.equal(game.starter_cards.find(card=>card.inst_id===2),target);assert.deepEqual(readFileSync(file),durable);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>gameResponse(state,route,body),/EISDIR|EPERM|EEXIST|rename/);}
    finally{(state as any).stateFile=file;rmdirSync(blocked);}
    assert.deepEqual(game,baseline);assert.equal(game.items,settledItems);assert.equal(game.starter_cards,roster);
    itemRows.forEach((item,index)=>assert.equal(game.items[index],item));
    assert.equal(game.starter_cards.find(card=>card.inst_id===2),target);assert.deepEqual(readFileSync(file),durable);
  }
  target.skill_1_level=4;target.skill_2_level=3;assert.deepEqual(game,settled);
  const reloaded=new ServerState("http://localhost",file,options);
  assert.deepEqual(reloaded.gameFor(reloaded.accountFor(actor,{})),settled);
  assert.deepEqual(reloaded.gameFor(reloaded.accountFor(peer,{})),peerBefore);
  assert.deepEqual(readFileSync(file),durable,"Restart does not reconsume recipes or grant replacements");
}finally{Date.now=oldNow;rmSync(directory,{recursive:true,force:true});}
console.log("Configured skill materials: shared references, duplicate-slot and intermediate-level aggregation, full instance IDs, split/locked stacks, single delta versus multi absolute receipts, shortages, real disk rollback, peer and restart passed; recipes remain local and create no items.");
