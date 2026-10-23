import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8")).env);
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js");
const {configuredGemPolish,planGemPolish}=await import("../src/gem-polish.js");
const {parseStateWithGemIds}=await import("../src/gem-wire.js");
const {polishRefs,polishPrices,suppliedGem,polishPolicy}=await import("./gem-polish-fixture.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-polish-")),file=path.join(dir,"state.json"),clock=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  const seed=new ServerState("http://localhost",file,{gemReferences:polishRefs});
  const auth=seed.registerGuest({device_id:"polish-owner"},{}).ret_data as any,peer=seed.registerGuest({device_id:"polish-peer"},{}).ret_data as any;
  const original=JSON.parse(readFileSync(file,"utf8"));original.gameStates[0][1].owned_gems=[suppliedGem()];original.gameStates[0][1].gold=1000;
  writeFileSync(file,JSON.stringify(original));
  const options={gemReferences:polishRefs,gemLevelPrices:polishPrices,gemPolishMode:"local-supplied-sequence" as const,gemPolishPolicy:polishPolicy(auth.pvid)};
  let state=new ServerState("http://localhost",file,options);
  const game=(state as any).gameByPvid.get(auth.pvid),beforeGame=structuredClone(game);
  const call=(extra:Record<string,unknown>={},s=state)=>gameResponse(s,"/gem/LevelUp",{...auth,inst_id:suppliedGem().inst_id,max_tries:1,...extra}) as any;
  assert.throws(()=>gameResponse(state,"/gem/LevelUp",{inst_id:1,max_tries:1}),/authenticated/);
  const bytes=readFileSync(file);
  for(const extra of [{...peer},{inst_id:"1"},{inst_id:"18446744073709551616"},{inst_id:1.1},{inst_id:true},
    {max_tries:0},{max_tries:"01"},{max_tries:true},{max_tries:101},{max_tries:1.5}])assert.equal(call(extra).result_code,2001);
  assert.deepEqual(readFileSync(file),bytes);assert.deepEqual(game,beforeGame);
  const failWrites=()=>{
    const gems=game.owned_gems,journal=(state as any).gemPolishJournals.get(auth.pvid),snapshot=structuredClone(game),saved=readFileSync(file);
    mkdirSync(file+".tmp");try{assert.throws(()=>call());}finally{rmdirSync(file+".tmp");}
    const blocked=path.join(dir,"blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>call());}finally{(state as any).stateFile=file;rmdirSync(blocked);}
    assert.equal(game.owned_gems,gems);assert.equal((state as any).gemPolishJournals.get(auth.pvid),journal);
    assert.deepEqual(game,snapshot);assert.deepEqual(readFileSync(file),saved);
  };
  failWrites();game.gold=99;assert.equal(call({max_tries:10}).result_code,2001);game.gold=1000;
  const failed=call();assert.equal(failed.result_code,1);assert.equal(failed.ret_data.tries,1);assert.equal(game.gold,990);
  assert.equal(game.owned_gems[0].level,1);assert.equal(game.owned_gems[0].abilities.level_up_failed,1);
  assert.deepEqual(failed.ret_data.user,{gold:{cur:990},item:[]});
  const wire=JSON.stringify(failed);assert.ok(wire.includes('"inst_id":18446744073709551615'));
  assert.equal((parseStateWithGemIds(wire) as any).ret_data.gem.inst_id,suppliedGem().inst_id);
  const first=JSON.parse(readFileSync(file,"utf8"));assert.equal(first.version,16);assert.deepEqual(first.dispatches,[]);assert.deepEqual(first.quests,[]);
  failWrites();
  state=new ServerState("http://localhost",file,options);
  const success=call({max_tries:10});assert.equal(success.result_code,1);assert.equal(success.ret_data.tries,2);
  let current=(state as any).gameByPvid.get(auth.pvid);assert.equal(current.gold,970);assert.deepEqual(current.owned_gems,[suppliedGem(2,0,"250")]);
  const next=call();assert.equal(next.result_code,1);assert.equal(next.ret_data.tries,1);assert.equal(current.gold,955);
  assert.deepEqual(current.owned_gems,[suppliedGem(3,0,"400")]);
  const done=readFileSync(file);assert.equal(call().result_code,2001);assert.deepEqual(readFileSync(file),done,"Exhaustion never repeats a prior transition/debit");
  assert.deepEqual(current,{...beforeGame,gold:955,owned_gems:[suppliedGem(3,0,"400")]});
  const final=JSON.parse(done.toString());assert.deepEqual(final.gameStates[1],original.gameStates[1]);
  const disabled=new ServerState("http://localhost",file,{gemReferences:polishRefs,gemLevelPrices:polishPrices});
  assert.equal(call({},disabled).result_code,2001);assert.deepEqual(readFileSync(file),done);
  // Subsequent legitimate sale may remove a polished Gem; journal is retained.
  const sold=structuredClone(final);sold.gameStates[0][1].owned_gems=[];writeFileSync(file,JSON.stringify(sold));
  new ServerState("http://localhost",file,{gemReferences:polishRefs,gemLevelPrices:polishPrices});
  for(const mutate of [(s:any)=>s.version=15,(s:any)=>s.gemPolishJournals=[],(s:any)=>s.gemPolishJournals[0][0]=999,
    (s:any)=>s.gemPolishJournals[0][1].cursors[0]=999,(s:any)=>s.gemPolishJournals[0][1].cursors[0]=2,
    (s:any)=>s.gameStates[0][1].owned_gems[0].abilities.main.hp="999"]){
    const corrupted=structuredClone(final);mutate(corrupted);const text=JSON.stringify(corrupted);writeFileSync(file,text);
    assert.throws(()=>new ServerState("http://localhost",file,options));assert.equal(readFileSync(file,"utf8"),text);
  }
  writeFileSync(file,done);
  const changed=structuredClone(options);changed.gemPolishPolicy.owners[auth.pvid][0].steps[0].after.abilities.main.hp="101";
  assert.throws(()=>new ServerState("http://localhost",file,changed));
  assert.throws(()=>new ServerState("http://localhost",file,{...options,gemLevelPrices:polishPrices.map(row=>({...row,price:row.price+1}))}));
  assert.deepEqual(readFileSync(file),done);
  for(const mutate of [(p:any)=>p.classification="original",(p:any)=>p.owners[auth.pvid][0].steps[0].after.rank=2,
    (p:any)=>p.owners[auth.pvid][0].steps[0].after.abilities.main.hp="1e100",
    (p:any)=>p.owners[auth.pvid][0].steps[0].after.level=2,
    (p:any)=>p.owners[auth.pvid][0].steps[0].before.abilities=null]){
    const policy=polishPolicy(auth.pvid);mutate(policy);assert.throws(()=>configuredGemPolish(policy,polishRefs,polishPrices));
  }
  let getter=false;const bad=polishPolicy(auth.pvid);Object.defineProperty(bad.owners[auth.pvid][0].steps[0].before,"target_inst_id",{enumerable:true,get(){getter=true;return "0";}});
  assert.throws(()=>configuredGemPolish(bad,polishRefs,polishPrices));assert.equal(getter,false);
  const policy=configuredGemPolish(polishPolicy(auth.pvid),polishRefs,polishPrices).get(auth.pvid)!;
  for(const gold of [0x80000000,0xffffffff])assert.throws(()=>planGemPolish(policy,[suppliedGem()],gold,{inst_id:suppliedGem().inst_id,max_tries:1},10));
  assert.throws(()=>planGemPolish(policy,[suppliedGem()],1000,{inst_id:suppliedGem().inst_id,max_tries:100},0x7fffffff));
  const allFailed=planGemPolish(policy,[suppliedGem()],1000,{inst_id:suppliedGem().inst_id,max_tries:2},10);
  assert.equal(allFailed.tries,2);assert.equal((allFailed.gem.abilities as any).level_up_failed,2);
  const short=structuredClone(policy);short.plans[0].steps=short.plans[0].steps.slice(0,1);
  assert.throws(()=>planGemPolish(short,[suppliedGem()],1000,{inst_id:suppliedGem().inst_id,max_tries:2},10),/unavailable/);
  const busyFile=path.join(dir,"busy.json"),busySnapshot=structuredClone(original),hunter=busySnapshot.gameStates[0][1].starter_cards[0].inst_id;
  Object.assign(busySnapshot.gameStates[0][1].owned_gems[0],{target_inst_id:String(hunter),position:1});
  writeFileSync(busyFile,JSON.stringify(busySnapshot));
  const mounted=polishPolicy(auth.pvid);
  for(const step of mounted.owners[auth.pvid][0].steps)for(const gem of [step.before,step.after])Object.assign(gem,{target_inst_id:String(hunter),position:1});
  const busyState=new ServerState("http://localhost",busyFile,{...options,gemPolishPolicy:mounted});
  assert.equal(busyState.startMission({...auth,stage_id:"n_01_01"},{}).result_code,1);
  const busyBytes=readFileSync(busyFile),refused=call({},busyState);
  assert.equal(refused.result_code,2001);assert.match(JSON.stringify(refused),/committed/);assert.deepEqual(readFileSync(busyFile),busyBytes);
  assert.equal(busyState.completeMission({...auth,stage_id:"n_01_01",play_info:'{"clear":0}'},{}).result_code,1);
  assert.equal(call({},busyState).result_code,1,"Mounted owner can polish again after combat ends");
} finally {Date.now=clock;rmSync(dir,{recursive:true,force:true});}
console.log("Supplied Gem polishing: exact complete transitions, accepted failure/batched stop-success, signed gold/full64 wire, checked maximum budget, sequence/history/pin guards, write/rename rollback, schema16/restart/modeoff/sale retention and unrelated-state preservation passed; no original RNG/growth/native execution claim.");
