import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-mirage-carry-"));
try {
  const file=path.join(dir,"state.json"),state=new ServerState("http://localhost",file);
  const auth=state.registerGuest({device_id:"mirage-carried-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"mirage-carried-peer"},{}).ret_data as any;
  const game=state.gameFor(state.accountFor(auth,{}));state.gameFor(state.accountFor(peer,{}));
  const hunter=game.starter_cards[0];
  for(const carried of [0,425,999,-1]) {
    hunter.mirage_remain_hp=carried; // Disposable authored historical-save probe.
    (state as any).persist();
    const bytes=readFileSync(file),snapshot=JSON.stringify(game);
    for(const payload of [auth,{...auth,entry:"t",inst_base:"t"},{...auth,entry:"f",reset:"0"}]) {
      const reply=gameResponse(state,"/mirage/GetInfo",payload) as any;
      assert.equal(reply.result_code,2001);
      assert.equal(reply.ret_data?.entry,undefined,"Refusal must not publish a destructive empty entry array");
      assert.equal(reply.ret_data?.inst_base,undefined);
    }
    assert.equal((gameResponse(state,"/mirage/GetInfo",peer) as any).result_code,1);
    assert.deepEqual((gameResponse(state,"/mirage/GetFriendInfo",auth) as any).ret_data,[]);
    assert.deepEqual(readFileSync(file),bytes);assert.equal(JSON.stringify(game),snapshot);
    const restarted=new ServerState("http://localhost",file);
    assert.equal((gameResponse(restarted,"/mirage/GetInfo",auth) as any).result_code,2001);
    assert.deepEqual(readFileSync(file),bytes);
  }
  hunter.mirage_remain_hp=1000;(state as any).persist();
  const bytes=readFileSync(file),reply=gameResponse(state,"/mirage/GetInfo",auth) as any;
  assert.equal(reply.result_code,1);assert.deepEqual(reply.ret_data.entry,[]);
  assert.equal((gameResponse(state,"/mirage/GetInfo",{...auth,reset:"t"}) as any).result_code,2001);
  assert.throws(()=>gameResponse(state,"/mirage/GetInfo",{}),/authenticated/);
  assert.deepEqual(readFileSync(file),bytes);
  game.recruited_cards.push({...hunter,inst_id:game.next_card_inst_id++,mirage_remain_hp:425});
  (state as any).persist();
  const recruitedBytes=readFileSync(file);
  assert.equal((gameResponse(state,"/mirage/GetInfo",auth) as any).result_code,2001,"Recruited carried Hunters also protect native cache");
  const restarted=new ServerState("http://localhost",file);
  assert.equal((gameResponse(restarted,"/mirage/GetInfo",auth) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),recruitedBytes);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Mirage carry preservation: empty lobby cannot clobber unrepresented native entry HP; owner isolation, all section flags, full save/restart and ordinary starter lobby passed.");
