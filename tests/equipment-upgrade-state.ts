import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmSync} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {repositoryPath} from "../src/paths.js";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8"));
Object.assign(process.env,profile.env);
const row={id:"AUTHORED_WEAPON1",type:1,rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),atk:"10000",atk_up:"2000"};
process.env.BLUSTONE_EQUIPMENT_REFERENCE_JSON=JSON.stringify({"001":[row,{...row,id:"AUTHORED_WEAPON2",rank:2,atk:"40000"},
  {...row,id:"AUTHORED_ARMOR",type:2},{...row,id:"AUTHORED_ACCESSORY",type:3}]});
const {ServerState}=await import("../src/state.js");
const {SEARCH_CAPSULE_ID}=await import("../src/search-capsules.js");
const directory=mkdtempSync(path.join(tmpdir(),"blustone-equipment-upgrade-"));
const level=(n:number,price:number)=>({level:n,price_type:2,price,item1_qty:1,item1_ref_id:SEARCH_CAPSULE_ID,
  item2_qty:0,item2_ref_id:"",item3_qty:0,item3_ref_id:"",item4_qty:0,item4_ref_id:""});
const options={equipmentLevelPrices:[level(2,17),level(3,19),level(11,29)],
  equipmentRankPrices:[{rank:2,attr:1,price_type:2,price:23,item_qty:1,item_ref_id:SEARCH_CAPSULE_ID,card_qty:0}]};
try {
  const filename=path.join(directory,"state.json");
  const state=new ServerState("http://localhost",filename,options);
  const auth=state.registerGuest({device_id:"equipment-upgrade-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"equipment-upgrade-peer"},{}).ret_data as any;
  const game=state.gameFor(state.accountFor(auth,{})),other=state.gameFor(state.accountFor(peer,{}));
  const target=game.starter_cards.find(card=>card.ref_id==="001")!;
  target.weapon_rank=1;target.weapon_level=1;target.lock=1;game.gold=100;
  game.items=[{inst_id:1,ref_id:SEARCH_CAPSULE_ID,qty:1,lock:0},{inst_id:2,ref_id:SEARCH_CAPSULE_ID,qty:8,lock:0}];
  game.next_item_inst_id=3;(state as any).persist();
  const peerBefore=JSON.stringify(other),bookBefore=JSON.stringify(game.card_book),decksBefore=JSON.stringify(game.decks);
  const body={...auth,inst_id:String(target.inst_id),part:"1",price_type:"2",source_inst_ids:"null"};
  const run=(action:"level"|"rank",patch:Record<string,unknown>={})=>state.equipmentReferenceAction(
    action==="level"?"/card_handler/LevelUpEquipment":"/card_handler/RankUpEquipment",{...body,...patch},{}) as any;
  const unchanged=(action:"level"|"rank",patch:Record<string,unknown>={})=>{
    const before=JSON.stringify(game),bytes=readFileSync(filename);
    assert.notEqual(run(action,patch).result_code,1);
    assert.equal(JSON.stringify(game),before);assert.deepEqual(readFileSync(filename),bytes);
  };
  assert.throws(()=>state.equipmentReferenceAction("/card_handler/LevelUpEquipment",{inst_id:String(target.inst_id),part:"1",price_type:"2"},{}),/authenticated|account/i);
  assert.throws(()=>run("level",{pvid:peer.pvid}),/account|identity|pvid/i);
  unchanged("level",{price_type:"0"});unchanged("level",{part:"0"});unchanged("rank");
  unchanged("level",{inst_id:"9999999"});
  game.gold=16;unchanged("level");game.gold=100;
  game.items.forEach(item=>item.lock=1);unchanged("level");game.items.forEach(item=>item.lock=0);
  target.mirage_remain_hp=999;unchanged("level");target.mirage_remain_hp=1000;
  game.active_battle={state:"active",deck_inst_ids:[target.inst_id]} as any;unchanged("level");game.active_battle=null;
  const first=run("level");assert.equal(first.result_code,1);
  assert.equal(game.gold,83);assert.equal(game.starter_cards.find(card=>card.inst_id===target.inst_id)!.weapon_level,2);
  assert.deepEqual(first.ret_data.user.item,[{inst_id:1,qty:0}]);
  assert.equal(Object.hasOwn(first.ret_data,"item"),false,"equipment item quantities belong to user, unlike Hunter sale");
  assert.equal(first.ret_data.user.card[0].weapon_rank,1);assert.equal(first.ret_data.user.card[0].weapon_level,2);
  // Native level body has no expected level/intent. Identical successful calls
  // are separate upgrades when another exact quote exists, not deduplicated.
  assert.equal(run("level").result_code,1);assert.equal(game.gold,64);
  assert.equal(game.starter_cards.find(card=>card.inst_id===target.inst_id)!.weapon_level,3);
  unchanged("level"); // next4 quote is absent, no fabricated fee.
  game.starter_cards.find(card=>card.inst_id===target.inst_id)!.weapon_level=10;
  (state as any).persist();
  const rankUp=run("rank");assert.equal(rankUp.result_code,1);
  assert.equal(game.gold,41);assert.equal(rankUp.ret_data.user.card[0].weapon_rank,2);
  assert.equal(rankUp.ret_data.user.card[0].weapon_level,10,"rank-up preserves level at exact cap");
  unchanged("rank");
  const old=JSON.stringify(game),bytes=readFileSync(filename),roster=game.starter_cards,items=game.items;
  mkdirSync(filename+".tmp");assert.throws(()=>run("level"));
  assert.equal(JSON.stringify(game),old);assert.equal(game.starter_cards,roster);assert.equal(game.items,items);
  assert.deepEqual(readFileSync(filename),bytes);rmSync(filename+".tmp",{recursive:true});
  const next=run("level");assert.equal(next.result_code,1);assert.equal(game.gold,12);
  assert.equal(next.ret_data.user.card[0].weapon_level,11);
  assert.equal(JSON.stringify(other),peerBefore);assert.equal(JSON.stringify(game.card_book),bookBefore);
  assert.equal(JSON.stringify(game.decks),decksBefore);
  const final=readFileSync(filename),restarted=new ServerState("http://localhost",filename,options);
  const restored=restarted.gameFor(restarted.accountFor(auth,{}));
  assert.equal(restored.gold,12);assert.equal(restored.starter_cards.find(card=>card.ref_id==="001")!.weapon_rank,2);
  assert.equal(restored.starter_cards.find(card=>card.ref_id==="001")!.weapon_level,11);
  assert.deepEqual(readFileSync(filename),final);
  restored.starter_cards.find(card=>card.ref_id==="001")!.weapon_level=10;restored.gold=100;
  (restarted as any).persist();
  const beforeGuild=JSON.stringify(restored),guildBytes=readFileSync(filename);
  (restarted as any).guildAction=()=>({result_code:1,ret_data:{my_guild:{guild_id:42}}});
  assert.notEqual(restarted.equipmentReferenceAction("/card_handler/LevelUpEquipment",body,{}).result_code,1);
  assert.equal(JSON.stringify(restored),beforeGuild);
  assert.deepEqual(readFileSync(filename),guildBytes);
  (restarted as any).guildAction=ServerState.prototype.guildAction;
  for(const [part,field,gold] of [["2","armor",83],["3","accessory",66]] as const) {
    const receipt=restarted.equipmentReferenceAction("/card_handler/LevelUpEquipment",{...body,part}, {}) as any;
    assert.equal(receipt.result_code,1);assert.equal(receipt.ret_data.user.card[0][`${field}_level`],2);
    assert.equal(restored.gold,gold);
    assert.equal(restored.starter_cards.find(card=>card.ref_id==="001")!.weapon_level,10,"unselected weapon field stays exact");
  }
} finally {rmSync(directory,{recursive:true,force:true});}
console.log("Equipment upgrades: configured no-Guild gold/material transactions, null/no-source rank cap, absolute receipts, auth/commitments/missing prices, rollback, restart and unrelated history preservation passed; original economy unknown.");
