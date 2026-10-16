import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {searchHelperReference} from "../src/search-helpers.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-trace-atomic-"));
const realNow=Date.now;Date.now=()=>1_800_000_000_000;
try {
  const file=path.join(directory,"state.json"),state=new ServerState("http://localhost",file);
  const games=(state as any).gameByPvid as Map<number,any>;
  const accounts=(state as any).accountsByPvid as Map<number,any>;
  const req=(auth:any,route:string,extra:Record<string,unknown>={})=>gameResponse(state,route,{...auth,...extra}) as any;
  const earnGuide=(device:string)=>{
    const auth=state.registerGuest({device_id:device},{}).ret_data as any,game=games.get(auth.pvid);
    assert.equal(state.startMission({...auth,stage_id:"n_01_08"},{}).result_code,1);
    assert.equal((state.completeMission({...auth,stage_id:"n_01_08",play_info:'{"clear":1}'},{}) as any).ret_data.accepted,true);
    assert.equal(req(auth,"/tuto/Clear",{type:37,step:0}).result_code,1);
    const begin=req(auth,"/explore/Begin",{owner:0,type:1,ref_id:"017",inst_id:0,friend_pvid:0,friend_leader_id:0,
      vfid:searchHelperReference().virtual_friend[0].id,wave_info:1});
    assert.equal(begin.result_code,1);
    assert.equal(req(auth,"/explore/End",{log_id:begin.ret_data.log_id,cleared_wave:2,play_info:'{"clear":1,"item_use":[]}'}).result_code,1);
    const trace=game.items.find((row:any)=>row.ref_id==="local_sylvester_trace");assert.equal(trace.qty,10);
    return {auth,game,trace};
  };
  const normal=earnGuide("trace-atomic-normal"),guided=earnGuide("trace-atomic-guided");
  state.registerGuest({device_id:"trace-atomic-unrelated"},{});
  const snapshot=()=>{
    const refs:Array<{root:any;keys:string[];value:any}>=[];
    const walk=(root:any,value:any,keys:string[]=[])=>{
      if(value===null||typeof value!=="object")return;
      refs.push({root,keys,value});
      for(const [key,child] of Object.entries(value))walk(root,child,[...keys,key]);
    };
    for(const value of [...games.values(),...accounts.values()])walk(value,value);
    return {bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),refs};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.games);assert.deepEqual([...accounts],before.accounts);
    for(const {root,keys,value} of before.refs)assert.equal(keys.reduce((row,key)=>row[key],root),value,`Preserve reference ${keys.join(".")}`);
  };
  const failedWrites=(operation:()=>unknown)=>{
    const before=snapshot();mkdirSync(file+".tmp");
    try{assert.throws(operation,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}
    unchanged(before);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(operation,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}
    unchanged(before);
  };
  const piece=()=>req(normal.auth,"/shop/PieceExchange",{item_inst_id:normal.trace.inst_id,cnt:1});
  const guidedClear=()=>req(guided.auth,"/tuto/Clear",{type:37,step:1});
  failedWrites(piece);failedWrites(guidedClear);
  assert.equal(normal.game.recruited_cards.length,0);assert.equal(guided.game.recruited_cards.length,0);
  const originalPersist=(state as any).persist.bind(state);let writes=0;
  (state as any).persist=()=>{writes++;originalPersist();};
  const normalResult=piece();assert.equal(normalResult.result_code,1);assert.equal(writes,1);
  assert.equal(normalResult.ret_data.card.length,1);assert.equal(normalResult.ret_data.card[0].ref_id,"006");
  assert.deepEqual(normalResult.ret_data.consumed_inst_list,[{inst_id:normal.trace.inst_id,qty:10}]);
  assert.equal(normalResult.ret_data.dailyquest_min_stage,"");assert.deepEqual(normalResult.ret_data.daily_quest,[]);assert.deepEqual(normalResult.ret_data.linear_quest,[]);
  assert.equal("consume_result" in normalResult.ret_data,false);assert.equal(normal.trace.qty,0);assert.equal(normal.game.recruited_cards.length,1);
  assert.equal(normal.game.tutorial.some((row:any)=>row.type===37&&row.step===1&&row.is_cleared),false);
  const guidedResult=guidedClear();assert.equal(guidedResult.result_code,1);assert.equal(writes,2);
  assert.equal(guidedResult.ret_data.card.length,1);assert.equal(guidedResult.ret_data.card[0].ref_id,"006");
  assert.deepEqual(guidedResult.ret_data.consume_result.item,[{inst_id:guided.trace.inst_id,qty:10}]);
  assert.equal("consumed_inst_list" in guidedResult.ret_data,false);assert.equal(guided.trace.qty,0);assert.equal(guided.game.recruited_cards.length,1);
  const settled=snapshot();mkdirSync(file+".tmp");
  try{assert.deepEqual(guidedClear().ret_data,{type:37,step:1});assert.notEqual(piece().result_code,1);}finally{rmdirSync(file+".tmp");}
  assert.equal(writes,2);unchanged(settled);
  const restarted=new ServerState("http://localhost",file),bytes=readFileSync(file);
  assert.deepEqual([...(restarted as any).gameByPvid], [...games]);
  assert.deepEqual(gameResponse(restarted,"/tuto/Clear",{...guided.auth,type:37,step:1}).ret_data,{type:37,step:1});
  assert.notEqual(gameResponse(restarted,"/shop/PieceExchange",{...normal.auth,item_inst_id:normal.trace.inst_id,cnt:1}).result_code,1);
  assert.deepEqual(readFileSync(file),bytes);
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
console.log("Trace recruitment atomicity: actual earned guide traces, real write/rename failures, exact account/game/nested refs and file bytes, single-write retries, native response differences, duplicate isolation and restart passed.");
