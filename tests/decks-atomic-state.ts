import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-decks-atomic-"));
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"atomic-deck-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"atomic-deck-peer"},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,game=games.get(actor.pvid);
  const first=game.starter_cards[0].inst_id,second=game.starter_cards[1].inst_id;
  // Isolated low-energy setup makes accidental lazy regeneration observable.
  game.ap=1;game.bp=1;game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();
  const change=[{type:1,list:[first,second]},{type:5,list:[second,first]}];
  const set=(rows:unknown,s=state)=>gameResponse(s,"/world/SetDeck",{...actor,deck_info:JSON.stringify(rows)}) as any;
  const snapshot=()=>({bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...(state as any).accountsByPvid]),
    accountRefs:[...(state as any).accountsByPvid],
    gameRefs:[...games],children:[...games].map(([_id,value])=>Object.entries(value)),decks:game.decks,
    deckRows:[...game.decks],lists:game.decks.map((deck:any)=>deck.list)});
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual([...games],before.games);assert.deepEqual([...(state as any).accountsByPvid],before.accounts);
    [...(state as any).accountsByPvid].forEach(([_id,value],index)=>assert.equal(value,before.accountRefs[index][1]));
    [...games].forEach(([_id,value],index)=>{
      assert.equal(value,before.gameRefs[index][1]);
      before.children[index].forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal(value[key],ref);});
    });
    assert.equal(game.decks,before.decks);
    game.decks.forEach((row:any,index:number)=>{assert.equal(row,before.deckRows[index]);assert.equal(row.list,before.lists[index]);});
    assert.deepEqual(readFileSync(file),before.bytes);
  };
  const original=snapshot();
  mkdirSync(file+".tmp");
  try{assert.throws(()=>set(change),/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}
  unchanged(original);
  const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
  try{assert.throws(()=>set(change),/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}
  unchanged(original);
  const accepted=set(change);assert.equal(accepted.result_code,1);
  assert.deepEqual(game.decks,[{type:1,list:[first,second,0,0,0]},{type:5,list:[second,first,0,0,0]}],"Normal and defense parties commit in one operation");
  assert.deepEqual(accepted.ret_data.deck,[{type:1,inst_id_1:first,inst_id_2:second,inst_id_3:0,inst_id_4:0,inst_id_5:0},
    {type:5,inst_id_1:second,inst_id_2:first,inst_id_3:0,inst_id_4:0,inst_id_5:0}]);
  assert.equal(game.ap,1);assert.equal(game.bp,1);
  assert.deepEqual(games.get(peer.pvid),original.games.find(([id])=>id===peer.pvid)![1]);
  now+=3_600_000;
  const after=snapshot();
  assert.notEqual(set([{type:1,list:[second]},{type:5,list:[99_999_999]}]).result_code,1,"A malformed later row refuses the whole batch");
  unchanged(after);
  for(const rows of [[],[{type:1,list:[first,first]}],[{type:1,list:[true]}],[{type:1,list:[0,0,0,0,0]}],
    [{type:1,list:[first]},{type:1,list:[second]}]]) {
    assert.notEqual(set(rows).result_code,1);unchanged(after);
  }
  // The existing identical parties are a normalized no-op even if the request
  // orders types differently or omits trailing zero slots. A real .tmp blocker
  // proves this path does not try to save or lazily regenerate AP/BP clocks.
  mkdirSync(file+".tmp");
  try{
    const repeat=set([{type:5,list:[second,first]},{type:1,list:[first,second,0,0]}]);
    assert.equal(repeat.result_code,1);assert.deepEqual(repeat.ret_data.deck,accepted.ret_data.deck);
  }finally{rmdirSync(file+".tmp");}
  unchanged(after);
  const restarted=new ServerState("http://localhost",file),restored=(restarted as any).gameByPvid.get(actor.pvid);
  assert.deepEqual(restored,game);assert.deepEqual(readFileSync(file),after.bytes);
  mkdirSync(file+".tmp");
  try{assert.equal(set(change,restarted).result_code,1);}finally{rmdirSync(file+".tmp");}
  assert.deepEqual(restored,game);assert.deepEqual(readFileSync(file),after.bytes);
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Atomic decks: real write/rename rollback preserves complete games/accounts/nested references and bytes; normalized normal/defense batch retry, later-row refusal, elapsed energy no-op/invalid preservation and restart passed.");
