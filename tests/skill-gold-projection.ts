import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

// Set before any transitive bootstrap import: each test runs in its own process.
process.env.BLUSTONE_SKILL_GOLD_PROFILE="screenshot-2018-gold-projection";
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const {skillGoldEvidence,skillLevelRows,skillUpPrice,createSkillLevelRows}=await import("../src/skill-training.js");
const previousNow=Date.now;
Date.now=()=>1_800_000_000_000;
const directory=mkdtempSync(path.join(tmpdir(),"blustone-skill-gold-projection-"));
try {
  const quotes=skillGoldEvidence().quotes;
  assert.deepEqual(quotes.map(row=>[row.idx,row.destination_level,row.displayed_fee]),
    [[2277,2,100],[444,6,200],[2591,21,500],[605,34,700],[1387,41,900]]);
  for(const role of [1,2,3,4]) {
    for(const quote of quotes) assert.equal(skillUpPrice(role,quote.destination_level)?.gold,quote.displayed_fee);
    assert.equal(skillUpPrice(role,5)?.gold,100);
    assert.equal(skillUpPrice(role,6)?.gold,200);
    assert.equal(skillUpPrice(role,10)?.gold,200);
    assert.equal(skillUpPrice(role,11)?.gold,300);
  }
  assert.throws(()=>createSkillLevelRows("unknown"),/Unknown skill gold profile/);
  assert.equal(createSkillLevelRows("legacy").find(row=>row.role===1&&row.level===6)?.gold,600);
  const file=path.join(directory,"state.json");
  const options={legacyCardIds:true};
  const initial=new ServerState("http://localhost",file,options);
  const actor=initial.registerGuest({device_id:"projection-actor"},{}).ret_data as any;
  const peer=initial.registerGuest({device_id:"projection-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8"));
  const authored=saved.gameStates.find(([id]:[number])=>id===actor.pvid)[1];
  const savedPeer=saved.gameStates.find(([id]:[number])=>id===peer.pvid)[1];
  const seeded=authored.starter_cards.find((card:any)=>card.inst_id===2);
  seeded.rank=2;seeded.skill_1_level=4;seeded.skill_2_level=9;
  authored.gold=10000;
  writeFileSync(file,JSON.stringify(saved));
  const state=new ServerState("http://localhost",file,options);
  const game=state.gameFor(state.accountFor(actor,{}));
  const target=game.starter_cards.find(card=>card.inst_id===2)!;
  const inventory=structuredClone(game.items),roster=game.starter_cards;
  const level=(gameResponse(state,"/reference/GetLevel",{}) as any).ret_data;
  assert.equal(level.skill.length,200);
  assert.deepEqual(level.skill,skillLevelRows,"Published GetLevel and settlement share the selected price vector");
  const single={...actor,target_inst_id:"2",skill_idx:"1"};
  const batch={...actor,target_inst_id:"2",mulit_skill_up_count:"[2,2,0,0,0]"};
  const first=gameResponse(state,"/gym/SkillUp",single) as any;
  assert.equal(first.result_code,1);
  assert.deepEqual(first.ret_data.user.gold,{prev:10000,cur:9900});
  assert.deepEqual(first.ret_data.target_inst.skill_1_level,{prev:4,cur:5});
  assert.deepEqual(first.ret_data.consumed_inst_list,[]);
  const next=gameResponse(state,"/gym/SkillUp",single) as any;
  assert.equal(next.result_code,1);
  assert.deepEqual(next.ret_data.user.gold,{prev:9900,cur:9700},"5→6 crosses the first quote bracket");
  const multi=gameResponse(state,"/gym/MultiSkillUp",batch) as any;
  assert.equal(multi.result_code,1);
  assert.deepEqual(multi.ret_data.user.gold,{prev:9700,cur:8800},"6→8 costs200+200 and9→11 costs200+300");
  assert.deepEqual(multi.ret_data.target_inst,{inst_id:2,skill_1_level:{cur:8},skill_2_level:{cur:11}});
  assert.deepEqual(multi.ret_data.consumed_inst_list,[],"Gold-only projection makes no item-consumption claim");
  assert.deepEqual(game.items,inventory);

  // Actual .tmp write and destination rename failures, not mocked persist.
  for(const [route,payload] of [["/gym/SkillUp",single],["/gym/MultiSkillUp",batch]] as const) {
    const snapshot=structuredClone(game),durable=readFileSync(file);
    mkdirSync(file+".tmp");
    try{assert.throws(()=>gameResponse(state,route,payload),/EISDIR|EPERM|EACCES|illegal operation/);}
    finally{rmdirSync(file+".tmp");}
    assert.deepEqual(game,snapshot);assert.equal(game.starter_cards,roster);
    assert.equal(game.starter_cards.find(card=>card.inst_id===2),target);
    assert.deepEqual(readFileSync(file),durable);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);
    (state as any).stateFile=blocked;
    try{assert.throws(()=>gameResponse(state,route,payload),/EISDIR|EPERM|EEXIST|rename/);}
    finally{(state as any).stateFile=file;rmdirSync(blocked);}
    assert.deepEqual(game,snapshot);assert.equal(game.starter_cards,roster);
    assert.equal(game.starter_cards.find(card=>card.inst_id===2),target);
    assert.deepEqual(readFileSync(file),durable,"Failed writes/renames cannot advance durable skills or wallet");
  }
  // A newly unlocked absent field must remain absent after persistence failure.
  delete target.skill_2_level;
  const absentSnapshot=structuredClone(target);
  mkdirSync(file+".tmp");
  try{assert.throws(()=>state.trainSkill({...single,skill_idx:2},{}));}
  finally{rmdirSync(file+".tmp");}
  assert.deepEqual(target,absentSnapshot);assert.equal(Object.hasOwn(target,"skill_2_level"),false);
  target.skill_2_level=11;
  for(const [route,payload] of [["/gym/SkillUp",single],["/gym/MultiSkillUp",batch]] as const) {
    (target as any).skill_1_level="8";
    const exactSnapshot=structuredClone(target),exactGold=game.gold,exactBytes=readFileSync(file);
    mkdirSync(file+".tmp");
    try{assert.throws(()=>gameResponse(state,route,payload));}
    finally{rmdirSync(file+".tmp");}
    assert.deepEqual(target,exactSnapshot,"Rollback preserves imported string field values, not just their numeric interpretation");
    assert.equal((target as any).skill_1_level,"8");assert.equal(game.gold,exactGold);
    assert.deepEqual(readFileSync(file),exactBytes);
    target.skill_1_level=8;
  }
  const beforeRefusal=structuredClone(game),durable=readFileSync(file);
  assert.equal(state.trainSkills({...batch,mulit_skill_up_count:"[13,0,0,0,0]"},{}).result_code,2001,"Rank2 cap20 is enforced");
  assert.deepEqual(game,beforeRefusal);assert.deepEqual(readFileSync(file),durable);
  const unsupportedPrices=skillLevelRows.filter(row=>row.level===9);
  for(const row of unsupportedPrices){row.source_1_ref_id="unresolved_material";row.source_1_qty=1;}
  try {
    assert.equal(state.trainSkill(single,{}).result_code,2001,"A future material row cannot silently settle as gold-only");
    assert.equal(state.trainSkills({...batch,mulit_skill_up_count:"[1,0,0,0,0]"},{}).result_code,2001);
    assert.deepEqual(game,beforeRefusal);assert.deepEqual(readFileSync(file),durable);
  }finally{for(const row of unsupportedPrices){row.source_1_ref_id="";row.source_1_qty=0;}}
  const reloaded=new ServerState("http://localhost",file,options);
  const restored=reloaded.gameFor(reloaded.accountFor(actor,{}));
  assert.equal(restored.gold,8800);
  assert.equal(restored.starter_cards.find(card=>card.inst_id===2)?.skill_1_level,8);
  assert.equal(restored.starter_cards.find(card=>card.inst_id===2)?.skill_2_level,11);
  assert.deepEqual(restored.items,inventory);
  assert.deepEqual(reloaded.gameFor(reloaded.accountFor(peer,{})),savedPeer,"Other account is untouched through settlement/restart");
  assert.deepEqual(readFileSync(file),durable);
} finally {
  Date.now=previousNow;
  rmSync(directory,{recursive:true,force:true});
}
console.log("Screenshot skill-gold projection: pinned quotes, shared GetLevel rows, bracket-by-bracket single/multi settlement, real write/rename rollback, cap, peer and restart passed; materials remain explicitly unconsumed local policy.");
