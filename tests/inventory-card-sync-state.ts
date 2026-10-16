import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-inventory-card-sync-"));
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"card-sync-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"card-sync-peer"},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,game=games.get(actor.pvid),peerGame=games.get(peer.pvid);
  const target=game.starter_cards[0],id=target.inst_id;
  assert.ok(id>1_000_000,"Use production owned-card identity namespace");
  // Explicit isolated imported ownership fixture: the peer owns this card,
  // but possession by another account must not make it available to the actor.
  const foreignId=1_000_999;peerGame.recruited_cards.push({...structuredClone(peerGame.starter_cards[0]),inst_id:foreignId});
  peerGame.next_card_inst_id=foreignId+1;(state as any).persist();
  const read=(extra:Record<string,unknown>={},s=state)=>gameResponse(s,"/world/RefreshInven",{...actor,card_inst_list:JSON.stringify([id]),...extra}) as any;
  const immutable=(operation:()=>any,s=state)=>{
    const bytes=readFileSync(file),beforeGames=structuredClone([...(s as any).gameByPvid]),beforeAccounts=structuredClone([...(s as any).accountsByPvid]);
    const priorGames=[...(s as any).gameByPvid.values()];
    const childReferences=priorGames.map(game=>Object.entries(game).filter(([_key,value])=>value!==null&&typeof value==="object"));
    const result=operation();
    assert.deepEqual([...(s as any).gameByPvid],beforeGames);assert.deepEqual([...(s as any).accountsByPvid],beforeAccounts);
    [...(s as any).gameByPvid.values()].forEach((value,index)=>{
      assert.equal(value,priorGames[index]);
      childReferences[index].forEach(([key,reference])=>assert.equal(value[key],reference));
    });
    assert.deepEqual(readFileSync(file),bytes,"Sync/refusal must not regenerate energy, mutate ownership or write state");return result;
  };
  const initial=immutable(()=>read());assert.equal(initial.result_code,1);assert.deepEqual(initial.ret_data,{card:[target]});
  assert.deepEqual(immutable(()=>read({card_inst_list:"[]"})).ret_data,{card:[]});
  for(const route of ["/world/RefreshInven","/world/UseItem","/world/GetFriendlyBattleInfo"]) {
    const bytes=readFileSync(file);assert.throws(()=>gameResponse(state,route,{}),/authenticated account required/);
    assert.throws(()=>gameResponse(state,route,{otp:actor.otp,pvid:peer.pvid}),/account|identity|pvid/i);assert.deepEqual(readFileSync(file),bytes);
  }
  const oldLock=target.lock;
  const toggle=gameResponse(state,"/card_handler/ToggleLock",{...actor,target_inst_id:id}) as any;
  assert.equal(toggle.result_code,1);assert.notEqual(target.lock,oldLock);
  const previousSkill=target.skill_1_level;
  const trained=gameResponse(state,"/gym/SkillUp",{...actor,target_inst_id:id,skill_idx:1}) as any;
  assert.equal(trained.result_code,1);assert.equal(target.skill_1_level,previousSkill+1);
  const expected=structuredClone(target),current=immutable(()=>read());
  assert.deepEqual(current.ret_data,{card:[expected]},"Sync returns absolute currently owned values after real mutations");
  assert.equal(current.ret_data.user,undefined);assert.equal(current.ret_data.item,undefined);assert.equal(current.ret_data.gem,undefined);
  assert.notEqual(current.ret_data.card[0],target);current.ret_data.card[0].exp=99999;current.ret_data.card[0].lock=oldLock;
  assert.deepEqual(target,expected,"Client DTO mutation cannot alter the retained owned card");
  assert.deepEqual(immutable(()=>read()).ret_data,{card:[expected]},"Repeated sync repeats absolute values without advancing skills");
  const duplicate=immutable(()=>read({card_inst_list:JSON.stringify([id,id])}));assert.deepEqual(duplicate.ret_data,{card:[expected]});
  for(const extra of [{card_inst_list:JSON.stringify([id,foreignId])},{card_inst_list:JSON.stringify([id,9_999_999])},
    {card_inst_list:"[18446744073709551615]"},{card_inst_list:"[0]"},{card_inst_list:"[true]"},
    {card_inst_list:'["'+id+'"]'},{card_inst_list:undefined},
    {item_ref_list:'["AIRSHIP_TICKET"]',card_inst_list:undefined},{item_ref_list:"[]"},
    {item_ref_list:[]},{item_ref_list:null}]) {
    const reply=immutable(()=>read(extra));assert.notEqual(reply.result_code,1);assert.equal(reply.ret_data.card,undefined,"No partial grant for mixed or unsupported selectors");
  }
  const forged=immutable(()=>read({target_pvid:peer.pvid,card:[{inst_id:foreignId}],items:[{ref_id:"AIRSHIP_TICKET",qty:999}],gem:[{inst_id:999}],profile_url:"forged"}));
  assert.deepEqual(forged.ret_data,{card:[expected]},"Unrecognized caller objects cannot enlarge the requested owned card set");
  now+=3_600_000;immutable(()=>read());
  const loaded=games.get(actor.pvid);games.delete(actor.pvid);
  const unavailable=immutable(()=>read());assert.notEqual(unavailable.result_code,1);assert.equal(games.has(actor.pvid),false,"Missing loaded inventory is refused without game allocation");
  games.set(actor.pvid,loaded);
  for(const route of ["/world/UseItem","/world/GetFriendlyBattleInfo"]) {
    const reply=immutable(()=>gameResponse(state,route,{...actor,inst_id:id,target_id:peer.pvid,qty:1,target_pvid:peer.pvid,card_inst_list:JSON.stringify([id])}));
    assert.notEqual(reply.result_code,1,"Unsupported mutation/battle info must not return generic success");assert.equal(reply.ret_data.card,undefined);
  }
  const bytes=readFileSync(file),restart=new ServerState("http://localhost",file);
  assert.deepEqual(immutable(()=>read({},restart),restart).ret_data,{card:[expected]});
  assert.deepEqual(readFileSync(file),bytes);
  assert.deepEqual((restart as any).gameByPvid.get(peer.pvid).recruited_cards,peerGame.recruited_cards,"Peer ownership persists without becoming actor inventory");
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Card-only inventory sync: production ownership, actual lock/skill changes, absolute detached DTOs, mixed/foreign/item-selector refusal, auth, unsupported world actions, elapsed-clock read-only preservation, missing-game refusal and restart passed.");
