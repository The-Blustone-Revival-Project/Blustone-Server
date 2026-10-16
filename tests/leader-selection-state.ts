import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-leader-selection-"));
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"leader-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"leader-peer"},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,game=games.get(actor.pvid);
  const initialId=game.leader_inst_id,target=game.starter_cards.find((card:any)=>card.inst_id!==initialId)!;
  assert.ok(target);assert.equal(target.lock,1,"Actual default locked ownership can be selected as leader");
  // Explicit native request metadata includes NO market field.
  const auth={app_code:"_SR",app_ver:"2.8.0.1",pvid:actor.pvid,otp:actor.otp};
  assert.equal(Object.hasOwn(auth,"market"),false);
  const set=(id:unknown,s=state)=>gameResponse(s,"/card_handler/SetLeader",{...auth,target_inst_id:id}) as any;
  game.ap=1;game.bp=1;game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();now+=3_600_000;
  const snapshot=()=>({bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...(state as any).accountsByPvid]),
    gameRefs:[...games],accountRefs:[...(state as any).accountsByPvid],children:[...games].map(([_id,value])=>Object.entries(value))});
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual([...games],before.games);assert.deepEqual([...(state as any).accountsByPvid],before.accounts);
    [...games].forEach(([_id,value],index)=>{
      assert.equal(value,before.gameRefs[index][1]);before.children[index].forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal(value[key],ref);});
    });
    [...(state as any).accountsByPvid].forEach(([_id,value],index)=>assert.equal(value,before.accountRefs[index][1]));
    assert.deepEqual(readFileSync(file),before.bytes);
  };
  let before=snapshot();
  assert.throws(()=>gameResponse(state,"/card_handler/SetLeader",{target_inst_id:target.inst_id}),/authenticated account required/);unchanged(before);
  assert.throws(()=>gameResponse(state,"/card_handler/SetLeader",{...auth,pvid:peer.pvid,target_inst_id:target.inst_id}),/account|identity|pvid/i);unchanged(before);
  for(const id of [undefined,null,true,0,-1,1.5,Number.MAX_SAFE_INTEGER+1,"01","1.0","1e2","18446744073709551616",99999999,"18446744073709551615"]){assert.notEqual(set(id).result_code,1);unchanged(before);}
  const loaded=games.get(actor.pvid);games.delete(actor.pvid);const missing=snapshot();
  assert.notEqual(set(target.inst_id).result_code,1);assert.equal(games.has(actor.pvid),false);unchanged(missing);games.set(actor.pvid,loaded);
  const originalRef=target.ref_id;target.ref_id="unpublished-ref";const unknown=snapshot();
  assert.notEqual(set(target.inst_id).result_code,1);unchanged(unknown);target.ref_id=originalRef;
  before=snapshot();
  mkdirSync(file+".tmp");
  try{const same=set(initialId);assert.equal(same.result_code,1);assert.equal(same.ret_data,initialId);}
  finally{rmdirSync(file+".tmp");}
  unchanged(before);
  mkdirSync(file+".tmp");
  try{assert.throws(()=>set(target.inst_id),/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}
  unchanged(before);
  const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
  try{assert.throws(()=>set(target.inst_id),/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}
  unchanged(before);

  // A real ordinary attempt tests the local mid-battle admission gate. The
  // current leader retry remains a no-op rather than failing an uncertain reply.
  assert.equal(state.startMission({...actor,stage_id:"n_01_01",deck_inst_id_1:initialId},{}).result_code,1);
  const inBattle=snapshot();assert.notEqual(set(target.inst_id).result_code,1);assert.equal(set(initialId).ret_data,initialId);unchanged(inBattle);
  assert.equal((state.completeMission({...actor,stage_id:"n_01_01",play_info:JSON.stringify({clear:0})},{}) as any).ret_data.clear,0);
  before=snapshot();
  const selected=set(String(target.inst_id));assert.equal(selected.result_code,1);assert.equal(typeof selected.ret_data,"number");assert.equal(selected.ret_data,target.inst_id);
  assert.equal(game.leader_inst_id,target.inst_id);
  const expected=structuredClone(before.games);expected.find(([id])=>id===actor.pvid)![1].leader_inst_id=target.inst_id;
  assert.deepEqual([...games],expected,"Selection changes only the leader word, retaining every deck/card/item/progress/clock value");
  before.children.forEach((children,index)=>children.forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal([...games][index][1][key],ref);}));
  const detailBefore=snapshot(),detail=gameResponse(state,"/world/GetUserDetail",{...auth,list:JSON.stringify([actor.pvid])}) as any;
  assert.equal(detail.result_code,1);assert.equal(detail.ret_data[0].inst_id_leader,target.inst_id);assert.equal(detail.ret_data[0].ref_id_leader,target.ref_id);unchanged(detailBefore);
  // These isolated imported pending flags exercise the other two LOCAL gates;
  // rejected changes/no-op retries must never persist these authored fixtures.
  for(const container of [game.search,game.arena]) {
    const previous=container.active;container.active={local_test_pending:true};const pending=snapshot();
    assert.notEqual(set(initialId).result_code,1);assert.equal(set(target.inst_id).ret_data,target.inst_id);unchanged(pending);container.active=previous;
  }
  now+=3_600_000;before=snapshot();mkdirSync(file+".tmp");
  try{assert.equal(set(target.inst_id).ret_data,target.inst_id);}finally{rmdirSync(file+".tmp");}unchanged(before);
  const restarted=new ServerState("http://localhost",file),restored=(restarted as any).gameByPvid.get(actor.pvid);
  assert.equal(restored.leader_inst_id,target.inst_id);assert.deepEqual(restored,game);assert.deepEqual(readFileSync(file),before.bytes);
  mkdirSync(file+".tmp");try{assert.equal(set(target.inst_id,restarted).ret_data,target.inst_id);}finally{rmdirSync(file+".tmp");}
  assert.deepEqual(restored,game);assert.deepEqual(readFileSync(file),before.bytes);
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Leader selection: native no-market auth/scalar reply, locked owned target, strict validation, actual battle and pending-attempt gates, exact write/rename rollback, no-op elapsed-clock preservation, profile reflection and restart passed.");
