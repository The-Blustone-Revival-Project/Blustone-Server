import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync,rmdirSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-deck-ref-")),file=path.join(directory,"state.json");
const clock=Date.now,recruit=process.env.BLUSTONE_RECRUIT_CARD;
Date.now=()=>1_800_000_000_000;process.env.BLUSTONE_RECRUIT_CARD="003";
try {
  const state=new ServerState("http://localhost",file);
  const raw=state.registerGuest({device_id:"deck-ref-owner"},{}).ret_data as any;
  const actor={pvid:raw.pvid,otp:raw.otp};state.registerGuest({device_id:"deck-ref-peer"},{});
  assert.equal(Object.hasOwn(actor,"market"),false,"Native authenticated account has no mandatory market payload here");
  const draw=()=>gameResponse(state,"/shop/GachaPremium",{...actor,cnt:1,item_inst_id:0}) as any;
  const first=draw(),second=draw();assert.equal(first.result_code,1);assert.equal(second.result_code,1);
  const a=first.ret_data.card,b=second.ret_data.card;
  assert.equal(a.ref_id,"003");assert.equal(b.ref_id,"003");assert.equal(a.rank,3);assert.equal(b.rank,3);
  assert.notEqual(a.inst_id,b.inst_id,"Actual paid duplicate instances, not duplicate raw IDs");
  assert.ok(a.inst_id>1_000_000&&b.inst_id>1_000_000,"Production owned namespace");
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>,game=games.get(actor.pvid);
  const main=game.starter_cards.find((card:any)=>card.ref_id==="001").inst_id;
  game.ap=1;game.bp=1;game.ap_updated_at=Date.now()-86_400_000;game.bp_updated_at=game.ap_updated_at;(state as any).persist();
  const set=(rows:unknown)=>gameResponse(state,"/world/SetDeck",{...actor,deck_info:JSON.stringify(rows)}) as any;
  const snapshot=()=>{
    const references:{root:any;path:string[];value:any}[]=[];
    const walk=(root:any,value:any,keys:string[]=[])=>{
      if(!value||typeof value!=="object")return;
      references.push({root,path:keys,value});for(const [key,child] of Object.entries(value))walk(root,child,[...keys,key]);
    };
    for(const value of [...games.values(),...accounts.values()])walk(value,value);
    return {bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),references};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.games);assert.deepEqual([...accounts],before.accounts);
    for(const {root,path:keys,value} of before.references)assert.equal(keys.reduce((row,key)=>row[key],root),value,keys.join('.'));
  };
  const invalid=[{type:1,list:[a.inst_id,b.inst_id,0,0,0]}];
  for(const rows of [invalid,[{type:2,list:[main,a.inst_id,0,0,0]},...invalid],
    [{type:1,list:[main,a.inst_id,b.inst_id,0,0]}]]) {
    const before=snapshot(),result=set(rows);assert.equal(result.result_code,2001);assert.match(result.ret_data.error,/same Hunter reference/);unchanged(before);
  }
  // The rejection occurs before persistence even when a writer is unavailable.
  mkdirSync(file+".tmp");try{const before=snapshot();assert.equal(set(invalid).result_code,2001);unchanged(before);}finally{rmdirSync(file+".tmp");}
  const roster=structuredClone([...game.starter_cards,...game.recruited_cards]),book=structuredClone(game.card_book);
  const valid=[{type:1,list:[main,a.inst_id,0,0,0]}];assert.equal(set(valid).result_code,1);
  assert.deepEqual(game.decks.find((row:any)=>row.type===1).list,valid[0].list);
  assert.deepEqual([...game.starter_cards,...game.recruited_cards],roster);assert.deepEqual(game.card_book,book);
  assert.equal(game.ap,1);assert.equal(game.bp,1);assert.equal(game.ap_updated_at,Date.now()-86_400_000);
  const same=snapshot();assert.equal(set(valid).result_code,1);unchanged(same);
  // Only the default ordinary type1 path was positively verified natively.
  // Existing admission of other deck types is deliberately not broadened here.
  assert.equal(set([{type:4,list:[a.inst_id,b.inst_id,0,0,0]}]).result_code,1);
  const durable=readFileSync(file);new ServerState("http://localhost",file);assert.deepEqual(readFileSync(file),durable);
  // Historical persisted clone parties are retained on load, never silently
  // repaired/deleted by the new request-time rule.
  const legacy=JSON.parse(durable.toString()),owner=legacy.gameStates.find(([id]:any)=>id===actor.pvid)[1];
  owner.decks.find((row:any)=>row.type===1).list=[a.inst_id,b.inst_id,0,0,0];
  const legacyFile=path.join(directory,"legacy.json");writeFileSync(legacyFile,JSON.stringify(legacy));const bytes=readFileSync(legacyFile);
  const restored=new ServerState("http://localhost",legacyFile);
  assert.deepEqual((restored as any).gameByPvid.get(actor.pvid).decks,owner.decks);assert.deepEqual(readFileSync(legacyFile),bytes);
} finally {
  Date.now=clock;if(recruit===undefined)delete process.env.BLUSTONE_RECRUIT_CARD;else process.env.BLUSTONE_RECRUIT_CARD=recruit;
  rmSync(directory,{recursive:true,force:true});
}
console.log("Ordinary deck reference admission: actual paid same-ref distinct production instances refuse atomically, valid distinct refs/zero slots and idempotence pass, no clock/write/nested-state effects, other types and legacy loaded parties preserved.");
