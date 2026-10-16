import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readFileSync,copyFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const file=fileURLToPath(import.meta.url),root=path.dirname(path.dirname(file)),worker=process.argv.indexOf("--worker");
if(worker===-1) {
  const directory=mkdtempSync(path.join(tmpdir(),"blustone-trace-profiles-")),legacy=path.join(directory,"legacy-guide.json");
  try {
    for(const [name,profile] of [["default",undefined],["explicit-local","local-fixture"],["historical","archive-images-2017-2018"],["invalid","unknown"]] as const) {
      const env={...process.env};delete env.BLUSTONE_TRACE_THRESHOLD_PROFILE;
      if(profile!==undefined)env.BLUSTONE_TRACE_THRESHOLD_PROFILE=profile;
      const result=spawnSync(process.execPath,[path.join(root,"node_modules/tsx/dist/cli.mjs"),file,"--worker",name,legacy],{cwd:root,env,encoding:"utf8"});
      if(name==="invalid"){assert.notEqual(result.status,0);assert.match(result.stderr,/Unknown trace threshold profile/);}
      else assert.equal(result.status,0,result.stdout+result.stderr);
    }
  }finally{rmSync(directory,{recursive:true,force:true});}
  console.log("Trace threshold profiles: isolated unset/explicit local/historical imports, immutable references/exchange prices, historical20/40 refusals and unchanged guided10 grant/default-to-historical receipt persistence passed.");
}else {
  const mode=process.argv[worker+1],legacy=process.argv[worker+2];
  // Every game/bootstrap import follows the child process's selected policy.
  const {TRACE_THRESHOLD_PROFILE,HUNTER_TRACE_ITEMS,itemReference}=await import("../src/hunter-traces.js");
  const {createLocalGameState}=await import("../src/game.js");
  const {exchangeHunterTraces}=await import("../src/trace-exchange.js");
  const {ServerState}=await import("../src/state.js");
  const {gameResponse}=await import("../src/game-routes.js");
  const {normalizeSearch}=await import("../src/search-battle.js");
  const {searchHelperReference}=await import("../src/search-helpers.js");
  const historical=mode==="historical",expected=historical?{ "005":40,"006":20 }:{"005":20,"006":10};
  assert.equal(TRACE_THRESHOLD_PROFILE,historical?"archive-images-2017-2018":"local-fixture");
  assert.ok(Object.isFrozen(HUNTER_TRACE_ITEMS));assert.ok(HUNTER_TRACE_ITEMS.every(Object.isFrozen));
  const rows=()=>itemReference().item;
  for(const trace of HUNTER_TRACE_ITEMS) {
    const quantity=expected[trace.cardId];assert.equal(trace.collect_qty,quantity);
    const published=rows().find(row=>row.id===trace.id)!;assert.equal(published.collect_qty,quantity);assert.equal(published.effect,trace.cardId);assert.equal(published.use_type,3);
    const game=createLocalGameState();game.items=[{inst_id:11,ref_id:trace.id,qty:quantity-1,lock:0}];
    const snapshot=structuredClone(game);let writes=0;
    assert.ok("error" in exchangeHunterTraces({item_inst_id:11,cnt:1},game,()=>writes++));assert.deepEqual(game,snapshot);assert.equal(writes,0);
    game.items[0].qty=quantity;game.items[0].lock=1;
    assert.ok("error" in exchangeHunterTraces({item_inst_id:11,cnt:1},game,()=>writes++));assert.equal(game.items[0].qty,quantity);
    game.items[0].lock=0;const count=game.recruited_cards.length;
    const result=exchangeHunterTraces({item_inst_id:11,cnt:1},game,()=>writes++);
    assert.ok("data" in result);if("data" in result) {
      assert.deepEqual(result.data.consumed_inst_list,[{inst_id:11,qty:quantity}]);
      assert.equal((result.data.card as any[])[0].ref_id,trace.cardId);
    }
    assert.equal(game.items[0].qty,0);assert.equal(game.recruited_cards.length,count+1);assert.equal(writes,1);
  }
  process.env.BLUSTONE_TRACE_THRESHOLD_PROFILE=historical?"local-fixture":"archive-images-2017-2018";
  for(const trace of HUNTER_TRACE_ITEMS)assert.equal(rows().find(row=>row.id===trace.id)!.collect_qty,expected[trace.cardId],"Changing process.env cannot reprice an imported policy");
  assert.throws(()=>{(HUNTER_TRACE_ITEMS[0] as unknown as {collect_qty:number}).collect_qty=999;},TypeError);
  const directory=mkdtempSync(path.join(tmpdir(),"blustone-trace-guide-")),filename=path.join(directory,"state.json"),oldNow=Date.now;
  Date.now=()=>1_800_000_000_000;
  try {
    if(historical) {
      assert.ok(existsSync(legacy));const bytes=readFileSync(legacy),restored=new ServerState("http://localhost",legacy);
      const saved=JSON.parse(bytes.toString()),pvid=saved.accounts[0].pvid,game=(restored as any).gameByPvid.get(pvid);
      assert.equal(game.search.last.attempt.guided,true);assert.equal(game.search.last.receipt.item[0].added,10);
      assert.equal(game.search.last.receipt.reward_item[0].qty,10);assert.deepEqual(readFileSync(legacy),bytes,"Historical profile accepts the default profile's retained10 receipt without rewriting it");
    }
    let state=new ServerState("http://localhost",filename);
    const auth=state.registerGuest({device_id:"trace-guide"},{}).ret_data as any;
    let game=state.gameFor(state.accountFor(auth,{}));
    // Earn the explicit guide gate and capsule through actual local routes.
    assert.equal(state.startMission({...auth,stage_id:"n_01_08"},{}).result_code,1);
    assert.equal((state.completeMission({...auth,stage_id:"n_01_08",play_info:'{"clear":1}'},{}) as any).ret_data.accepted,true);
    assert.equal(gameResponse(state,"/tuto/Clear",{...auth,type:37,step:0}).result_code,1);
    const helper=searchHelperReference().virtual_friend[0].id;
    const begin=gameResponse(state,"/explore/Begin",{...auth,owner:0,type:1,ref_id:"017",inst_id:0,friend_pvid:0,friend_leader_id:0,vfid:helper,wave_info:1}) as any;
    assert.equal(begin.result_code,1);assert.equal(game.search.active?.guided,true);
    const finish={...auth,log_id:begin.ret_data.log_id,cleared_wave:2,play_info:'{"clear":1,"item_use":[]}'};
    const receipt=gameResponse(state,"/explore/End",finish) as any;assert.equal(receipt.result_code,1);
    assert.equal(receipt.ret_data.item[0].added,10);assert.equal(receipt.ret_data.reward_item[0].qty,10);
    assert.equal(game.items.find(row=>row.ref_id==="local_sylvester_trace")!.qty,10);
    assert.deepEqual(normalizeSearch(game.search),game.search);
    const settled=readFileSync(filename);
    if(mode==="default")copyFileSync(filename,legacy);
    state=new ServerState("http://localhost",filename);game=state.gameFor(state.accountFor(auth,{}));
    assert.deepEqual((gameResponse(state,"/explore/End",finish) as any).ret_data,{...receipt.ret_data,item:[]});assert.deepEqual(readFileSync(filename),settled,"Restarted receipt replay never raises the original guided award");
    const recruit=gameResponse(state,"/tuto/Clear",{...auth,type:37,step:1}) as any;
    if(historical){assert.notEqual(recruit.result_code,1);assert.deepEqual(readFileSync(filename),settled,"Historical20 threshold cannot turn an existing10 award into extra traces or an unearned Hunter");}
    else {assert.equal(recruit.result_code,1);assert.deepEqual(recruit.ret_data.consume_result.item,[{inst_id:receipt.ret_data.item[0].inst_id,qty:10}]);}
  }finally{Date.now=oldNow;rmSync(directory,{recursive:true,force:true});}
}

