import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {cardInstance} from "../src/bootstrap.js";
import {hunterRegistrationTime} from "../src/hunter-registration.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-registration-")),clock=Date.now;
let now=1_800_000_000_789;Date.now=()=>now;
try {
  assert.equal(hunterRegistrationTime(now),1800000000);assert.equal(hunterRegistrationTime(0),0);
  assert.equal(hunterRegistrationTime(0xffff_ffff*1000+999),0xffff_ffff);
  for(const invalid of [-1,NaN,Infinity,1.5,0x1_0000_0000*1000,Number.MAX_SAFE_INTEGER])assert.throws(()=>hunterRegistrationTime(invalid));
  const file=path.join(directory,"state.json"),state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"birthtime-owner"},{}).ret_data as any;
  const game=(state as any).gameByPvid.get(actor.pvid),starter=structuredClone(game.starter_cards);
  const pull=state.gachaPremium({...actor,cnt:11},{}).ret_data as any;
  assert.equal(pull.cnt,11);assert.ok(pull.card.every((row:any)=>row.regdate===1800000000));
  assert.ok(game.recruited_cards.every((row:any)=>row.regdate===1800000000));assert.deepEqual(game.starter_cards,starter);
  assert.equal(cardInstance(9000000,"002").regdate,0,"Transient/template factory is not a new owned acquisition");
  now+=86400000;game.items=[{inst_id:99,ref_id:"local_sylvester_trace",qty:20,lock:0}];game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();
  const exchange=()=>gameResponse(state,"/shop/PieceExchange",{...actor,item_inst_id:99,cnt:2}) as any;
  const before=structuredClone(game),bytes=readFileSync(file),book=game.card_book,recruits=game.recruited_cards;
  mkdirSync(file+".tmp");try{assert.throws(exchange);assert.deepEqual(game,before);assert.equal(game.card_book,book);assert.equal(game.recruited_cards,recruits);assert.deepEqual(readFileSync(file),bytes);}finally{rmdirSync(file+".tmp");}
  const trace=exchange();assert.equal(trace.result_code,1);assert.ok(trace.ret_data.card.every((row:any)=>row.regdate===1800086400));
  assert.ok(game.recruited_cards.slice(0,11).every((row:any)=>row.regdate===1800000000));
  const persisted=structuredClone(game);now+=86400000;
  const restored=new ServerState("http://localhost",file);assert.deepEqual((restored as any).gameByPvid.get(actor.pvid),persisted,"Restore does not retimestamp old acquisitions");
  // A clock too large for the native field cannot create stock or debit funds.
  game.items[0].qty=20;(state as any).persist();now=0x1_0000_0000*1000;
  game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();const bad=structuredClone(game),badBytes=readFileSync(file);
  assert.notEqual(exchange().result_code,1);assert.deepEqual(game,bad);assert.deepEqual(readFileSync(file),badBytes);
  assert.notEqual(state.gachaPremium({...actor,cnt:1},{}).result_code,1);assert.deepEqual(game,bad);assert.deepEqual(readFileSync(file),badBytes);
  console.log("Hunter registration: actual gacha/trace batches use bounded epoch seconds, old/template dates persist, failure rollback and invalid-clock no-debit passed");
}finally{Date.now=clock;rmSync(directory,{recursive:true,force:true});}
