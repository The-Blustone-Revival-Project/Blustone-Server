import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE="catalogue-birth-rank-projection";
process.env.BLUSTONE_CARD_REFERENCE_PROFILE="materials";
const {characterIdentities}=await import("../src/character-materials.js");
process.env.BLUSTONE_PACKAGE_NAMES=characterIdentities.filter(row=>/^\d{3}$/.test(row.id)).flatMap(row=>["","_Q","_EFT","_SND"].map(suffix=>`C${row.id}${suffix}.jet`)).join(",");
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const {cardInstance,starterReference,starterLevels}=await import("../src/bootstrap.js");
const {planQuickAdvancement,quickAdvancementMode}=await import("../src/quick-advancement.js");
const directory=mkdtempSync(path.join(tmpdir(),"blustone-quick-ticket-")),clock=Date.now;Date.now=()=>1_800_000_000_000;
try {
  assert.throws(()=>quickAdvancementMode("guessed-original"));
  const four=starterReference.find(row=>row.base.is_main===0&&row.stat[0].rank===4)!;assert.ok(four,"Authored material-package selection admits a community four-star reference");
  for(const [rank,ref,ticket,wide] of [[3,"003","SU1","9007199254740993"],[4,four.base.id,"SU2","18446744073709551615"]] as const) {
    const file=path.join(directory,ticket+".json"),state=new ServerState("http://localhost",file,{quickAdvancementMode:"local-owned-tickets"});
    const actor=state.registerGuest({device_id:ticket+"-owner"},{}).ret_data as any;
    const peer=state.registerGuest({device_id:ticket+"-peer"},{}).ret_data as any;
    const game=(state as any).gameByPvid.get(actor.pvid),target=cardInstance(1000100,ref,rank);
    target.exp=123;target.rank_up_cnt=1;target.lock=1;target.regdate=0;
    const initialQty=rank===4?1:2;game.recruited_cards=[target];game.next_card_inst_id=1000101;game.items=[{inst_id:wide,ref_id:ticket,qty:initialQty,lock:0}];(state as any).persist();
    const peerBefore=structuredClone((state as any).gameByPvid.get(peer.pvid));
    const request={...actor,inst_id:wide,target_id:target.inst_id,qty:1};
    const run=(extra={})=>gameResponse(state,"/world/UseItem",{...request,...extra}) as any;
    const snapshot=()=>({game:structuredClone(game),disk:readFileSync(file),book:game.card_book,item:game.items[0],cards:game.recruited_cards});
    const exact=(before:ReturnType<typeof snapshot>)=>{assert.deepEqual(game,before.game);assert.deepEqual(readFileSync(file),before.disk);assert.equal(game.card_book,before.book);assert.equal(game.items[0],before.item);assert.equal(game.recruited_cards,before.cards);assert.equal(game.recruited_cards[0],target);};
    const invalid=(extra:object)=>{const before=snapshot();assert.notEqual(run(extra).result_code,1);exact(before);};
    assert.ok(state.itemReferenceRows().item.some(row=>row.id===ticket&&row.use_type===0));
    for(const extra of [{qty:2},{qty:true},{inst_id:0},{inst_id:"09007199254740993"},{inst_id:Number(wide)},{target_id:"9007199254740993"},{target_id:999},{rank:5},{exp:0},{price:0}])invalid(extra);
    game.items[0].lock=1;invalid({});game.items[0].lock=0;
    game.items[0].qty=0;invalid({});game.items[0].qty=initialQty;
    game.items[0].ref_id=ticket==="SU1"?"SU2":"SU1";invalid({});game.items[0].ref_id=ticket;
    for(const key of ["arena","search"]) {const value=game[key].active;game[key].active={};invalid({});game[key].active=value;}
    const active=game.active_battle;game.active_battle={state:"active"};invalid({});game.active_battle=active;
    (state as any).dispatches.set(actor.pvid,{active:{deck:[target.inst_id]}});invalid({});(state as any).dispatches.delete(actor.pvid);
    const awake=target.awk_step;target.awk_step=1;invalid({});target.awk_step=awake;
    game.items.push({...game.items[0],ref_id:"other"});invalid({});game.items.pop();
    assert.throws(()=>gameResponse(state,"/world/UseItem",{inst_id:wide,target_id:target.inst_id,qty:1}),/authenticated|account/i);
    const currentExp=starterLevels.card.find(row=>row.rank===rank+1&&row.level===1)!.min_exp;
    // Read-only plan respects the supplied level1 curve, not a hardcoded EXP0.
    const custom=starterLevels.card.map(row=>row.rank===rank+1&&row.level===1?{...row,min_exp:77}:row);
    assert.equal(planQuickAdvancement(request,game,starterReference,custom).next.exp,77);
    const higher=cardInstance(1000101,ref,rank+1);game.recruited_cards.push(higher);
    assert.equal(planQuickAdvancement(request,game,starterReference,starterLevels.card).next.rank,rank+1,"Owned-ticket delivery does not reimpose the initial popup's competing-copy gate");game.recruited_cards.pop();
    (state as any).persist();const before=snapshot();
    mkdirSync(file+".tmp");try{assert.throws(()=>run());}finally{rmdirSync(file+".tmp");}exact(before);
    const blocked=file+"-blocked";mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>run());}finally{(state as any).stateFile=file;rmdirSync(blocked);}exact(before);
    const result=run();assert.equal(result.result_code,1);
    assert.equal(target.rank,rank+1);assert.equal(target.rank_up_cnt,0);assert.equal(target.exp,currentExp);assert.equal(game.items[0].qty,initialQty-1);
    assert.deepEqual(result.ret_data.card.target_inst,{inst_id:target.inst_id,rank:{prev:rank,cur:rank+1},rank_up_cnt:{prev:1,cur:0},exp:{prev:123,cur:currentExp}});
    assert.match(JSON.stringify(result.ret_data.consumed_item_list),new RegExp(`"inst_id":${wide},"qty":1`));
    assert.deepEqual(result.ret_data.achievement,[]);assert.equal(result.ret_data.user,undefined);assert.equal(result.ret_data.consumed_inst_list,undefined);
    const expected=structuredClone(before.game);Object.assign(expected.recruited_cards[0],{rank:rank+1,rank_up_cnt:0,exp:currentExp});expected.items[0].qty=initialQty-1;expected.card_book=game.card_book;
    assert.deepEqual(game,expected,"Only ticket stock, target promotion and book change; no wallet/clock/skills/equipment/date/allocator changes");
    assert.ok(game.card_book.some((row:any)=>row.ref_id===ref&&row.rank===rank+1));assert.deepEqual((state as any).gameByPvid.get(peer.pvid),peerBefore);
    const done=snapshot();assert.notEqual(run().result_code,1);exact(done);
    const restored=new ServerState("http://localhost",file,{quickAdvancementMode:"local-owned-tickets"});assert.deepEqual((restored as any).gameByPvid.get(actor.pvid),game);
    const disabled=new ServerState("http://localhost",file);assert.ok(disabled.itemReferenceRows().item.some(row=>row.id===ticket));assert.notEqual(gameResponse(disabled,"/world/UseItem",request).result_code,1);assert.deepEqual(readFileSync(file),done.disk);
  }
  console.log("Quick advancement: original ownedSU1/SU2 IDs, narrow natural-grade policy, exact U64 consumption, level1 reference, no retroactive popup expiry, atomic rollback/restart, disabled stock display and unchanged wallets/skills passed; counter reset LOCAL");
}finally{Date.now=clock;rmSync(directory,{recursive:true,force:true});}
