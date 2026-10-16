import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {ARENA_RIVAL_PVID} from "../src/arena.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-arena-atomic-"));
const realNow=Date.now;Date.now=()=>1_800_000_000_000;
try {
  const file=path.join(directory,"state.json");
  const state=new ServerState("http://localhost",file);
  const auth=state.registerGuest({device_id:"arena-atomic-owner"},{}).ret_data as any;
  state.registerGuest({device_id:"arena-atomic-peer"},{});
  const games=(state as any).gameByPvid as Map<number,any>,game=games.get(auth.pvid);
  const action=(route:string,extra={})=>gameResponse(state,"/arena/"+route,{...auth,...extra}) as any;
  const start={target_pvid:ARENA_RIVAL_PVID,bid:0,is_revenge:0,is_friendship:0};
  const metrics={is_win:1,clear_time:10,dead_cnt:0,player_total_hp:100,player_total_hp_max:100,
    enemy_total_hp:0,enemy_total_hp_max:300,atk_max:181,atk_total:300,atk_cnt:2};
  const complete={target_pvid:ARENA_RIVAL_PVID,is_revenge:0,play_info:JSON.stringify(metrics)};
  const snapshot=()=>({bytes:readFileSync(file),value:structuredClone([...games]),refs:[...games],
    children:[...games].map(([_id,g])=>Object.entries(g)),arena:game.arena,active:game.arena.active,
    last:game.arena.last_result,decks:game.decks,rows:[...game.decks],lists:game.decks.map((d:any)=>d.list)});
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual([...games],before.value);assert.deepEqual(readFileSync(file),before.bytes);
    [...games].forEach(([_id,g],index)=>{
      assert.equal(g,before.refs[index][1]);
      before.children[index].forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal(g[key],ref);});
    });
    assert.equal(game.arena,before.arena);assert.equal(game.arena.active,before.active);
    assert.equal(game.arena.last_result,before.last);assert.equal(game.decks,before.decks);
    game.decks.forEach((row:any,index:number)=>{assert.equal(row,before.rows[index]);assert.equal(row.list,before.lists[index]);});
  };
  const failedWrites=(operation:()=>unknown)=>{
    const before=snapshot();
    mkdirSync(file+".tmp");
    try{assert.throws(operation,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}
    unchanged(before);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(operation,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}
    unchanged(before);
  };
  failedWrites(()=>action("Enter"));
  assert.equal(game.decks.some((d:any)=>d.type===4||d.type===5),false);
  // Start may initialize the attack deck without an earlier Enter.
  failedWrites(()=>action("BattleStart",start));
  const bp=game.bp;assert.equal(action("BattleStart",start).result_code,1);
  assert.equal(game.bp,bp-1);assert.equal(game.decks.some((d:any)=>d.type===4),true);
  assert.equal(game.decks.some((d:any)=>d.type===5),false);
  failedWrites(()=>action("Enter")); // Preserve the existing attack row/list.
  assert.equal(action("Enter").result_code,1);
  const honor=game.honor;
  failedWrites(()=>action("BattleComplete",complete));
  assert.ok(game.arena.active,"A failed win retains its original retryable attempt");
  assert.equal(game.arena.win,0);assert.equal(game.honor,honor);
  const won=action("BattleComplete",complete);assert.equal(won.result_code,1);
  assert.equal(game.arena.win,1);assert.equal(game.honor,honor+10);assert.equal(game.arena.active,null);
  const settled=snapshot();
  mkdirSync(file+".tmp");
  try{assert.deepEqual(action("BattleComplete",complete),won);}finally{rmdirSync(file+".tmp");}
  unchanged(settled);
  assert.equal(action("BattleStart",start).result_code,1);
  const lost={...complete,play_info:JSON.stringify({...metrics,is_win:0,enemy_total_hp:100})};
  failedWrites(()=>action("BattleComplete",lost));
  assert.equal(action("BattleComplete",lost).result_code,1);
  assert.equal(game.arena.win,1);assert.equal(game.arena.lose,1);assert.equal(game.arena.rating_point,0);
  assert.equal(game.honor,honor+10);assert.equal(game.bp,bp-2);
  const bytes=readFileSync(file),restart=new ServerState("http://localhost",file);
  assert.deepEqual((restart as any).gameByPvid.get(auth.pvid),game);assert.deepEqual(readFileSync(file),bytes);
  assert.equal(gameResponse(restart,"/arena/BattleComplete",{...auth,...lost}).result_code,1);
  assert.deepEqual(readFileSync(file),bytes);
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
console.log("Arena atomic transitions: real write/rename failures restore exact entry decks, Start BP/attempt, win/loss counters, honor and prior receipts; retries/replays/restart and unrelated games preserved.");
