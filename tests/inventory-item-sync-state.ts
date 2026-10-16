import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

// Configure a declared LOCAL two-capsule recipe before bootstrap imports.
process.env.BLUSTONE_SKILL_GOLD_PROFILE="legacy";
process.env.BLUSTONE_SKILL_MATERIAL_PRICES_JSON=JSON.stringify([1,2,3,4].map(role=>({role,level:2,
  source_1_ref_id:"AIRSHIP_TICKET",source_1_qty:2,source_2_ref_id:"",source_2_qty:0,
  source_3_ref_id:"",source_3_qty:0,source_4_ref_id:"",source_4_qty:0})));
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
const directory=mkdtempSync(path.join(tmpdir(),"blustone-item-sync-state-"));
try {
  const file=path.join(directory,"state.json");let state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"item-sync-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"item-sync-peer"},{}).ret_data as any;
  let games=(state as any).gameByPvid as Map<number,any>,game=games.get(actor.pvid),peerGame=games.get(peer.pvid);
  const target=game.starter_cards[0],cardId=target.inst_id,foreignId=1_000_999;
  assert.ok(cardId>=1_000_000,"Use actual production identity namespace");
  // Explicit disposable imported stock. No acquisition is inferred from metadata.
  game.items=[{inst_id:10,ref_id:"AIRSHIP_TICKET",qty:2,lock:0,buy_cnt_gold:3,buy_cnt_manda:4},
    {inst_id:20,ref_id:"AIRSHIP_TICKET",qty:7,lock:1},
    {inst_id:21,ref_id:"AIRSHIP_TICKET",qty:0,lock:0},
    {inst_id:40,ref_id:"UNPUBLISHED_IMPORTED_REF",qty:9,lock:1}];game.next_item_inst_id=41;
  peerGame.items=[{inst_id:99,ref_id:"AIRSHIP_TICKET",qty:123,lock:0}];
  peerGame.recruited_cards.push({...structuredClone(peerGame.starter_cards[0]),inst_id:foreignId});peerGame.next_card_inst_id=foreignId+1;
  (state as any).persist();
  const lock=target.lock;
  assert.equal((gameResponse(state,"/card_handler/ToggleLock",{...actor,target_inst_id:cardId}) as any).result_code,1);
  assert.notEqual(target.lock,lock);
  assert.equal(target.skill_1_level,1);
  const trained=gameResponse(state,"/gym/SkillUp",{...actor,target_inst_id:cardId,skill_idx:1}) as any;
  assert.equal(trained.result_code,1);assert.equal(target.skill_1_level,2);
  assert.equal(game.items.find((row:any)=>row.inst_id===10).qty,0,"Actual material settlement creates a real zero-stock snapshot");
  assert.equal(game.items.find((row:any)=>row.inst_id===20).qty,7,"Locked stack remains unconsumed");
  // Add a full64 imported item AFTER material settlement: its separate planner
  // deliberately admits numeric safe stored IDs only, whereas sync preserves64.
  game.items.push({inst_id:"18446744073709551615",ref_id:"AIRSHIP_TICKET",qty:1,lock:0,buy_cnt_manda:0xffff_ffff});
  (state as any).persist();
  const requested={item_ref_list:'["AIRSHIP_TICKET"]'},combined={...requested,card_inst_list:JSON.stringify([cardId])};
  const invoke=(extra:Record<string,unknown>,s=state)=>gameResponse(s,"/world/RefreshInven",{...actor,...extra}) as any;
  const immutable=(extra:Record<string,unknown>,s=state)=>{
    const bytes=readFileSync(file),before=structuredClone([...(s as any).gameByPvid]),accounts=structuredClone([...(s as any).accountsByPvid]);
    const refs=[...(s as any).gameByPvid.values()].map((g:any)=>({g,children:Object.entries(g).filter(([,v])=>v!==null&&typeof v==="object")}));
    const reply=invoke(extra,s);
    assert.deepEqual([...(s as any).gameByPvid],before);assert.deepEqual([...(s as any).accountsByPvid],accounts);
    for(const {g,children} of refs){assert.equal((s as any).gameByPvid.get([...((s as any).gameByPvid as Map<number,any>)].find(([,v])=>v===g)![0]),g);
      for(const [key,value] of children)assert.equal(g[key],value);}
    assert.deepEqual(readFileSync(file),bytes,"All sync/refusal reads preserve durable state and nested object references");
    return reply;
  };
  const decode=(reply:any)=>JSON.parse(JSON.stringify(reply),(_key,value,context?:{source:string})=>
    typeof value==="number"&&!Number.isSafeInteger(value)?context!.source:value);
  const initial=immutable(combined);assert.equal(initial.result_code,1);
  const wire=JSON.stringify(initial);assert.ok(wire.includes('"inst_id":18446744073709551615'));
  assert.ok(!wire.includes('"inst_id":"18446744073709551615"'),"Native uint64 identity stays a numeric JSON token");
  const decoded=decode(initial);
  const expectedItems=structuredClone(game.items.filter((row:any)=>row.ref_id==="AIRSHIP_TICKET"));
  assert.deepEqual(decoded.ret_data,{item:expectedItems,card:[structuredClone(target)]});
  assert.equal(decoded.ret_data.item[0].qty,0);assert.equal(decoded.ret_data.item[0].buy_cnt_gold,3);
  assert.equal(decoded.ret_data.item[0].buy_cnt_manda,4);assert.equal(decoded.ret_data.item[1].buy_cnt_gold,undefined);
  assert.equal(decoded.ret_data.item.at(-1).buy_cnt_manda,0xffff_ffff);
  assert.equal(decoded.ret_data.gem,undefined);assert.equal(decoded.ret_data.user,undefined);
  initial.ret_data.item[0].qty=999;initial.ret_data.card[0].exp=999;
  assert.deepEqual(decode(immutable(combined)).ret_data,decoded.ret_data,"Returned DTOs are detached absolute values");
  assert.deepEqual(decode(immutable(requested)).ret_data,{item:expectedItems});
  assert.deepEqual(decode(immutable({...combined,item_ref_list:'["AIRSHIP_TICKET","AIRSHIP_TICKET"]'})).ret_data,decoded.ret_data);
  assert.deepEqual(immutable({item_ref_list:"[]"}).ret_data,{item:[]});
  assert.deepEqual(immutable({item_ref_list:'["not-owned-anywhere"]'}).ret_data,{item:[]});
  assert.deepEqual(immutable({item_ref_list:"[]",card_inst_list:"[]"}).ret_data,{item:[],card:[]});
  const refuse=(extra:Record<string,unknown>)=>{const result=immutable(extra);assert.notEqual(result.result_code,1);
    assert.equal(result.ret_data.item,undefined);assert.equal(result.ret_data.card,undefined);};
  for(const extra of [{item_ref_list:'["UNPUBLISHED_IMPORTED_REF"]'},{...combined,card_inst_list:JSON.stringify([cardId,foreignId])},
    {...combined,card_inst_list:"[9999999]"},{...combined,card_inst_list:"[true]"},{...combined,item_ref_list:"[1]"},
    {...combined,item_ref_list:"null"},{...combined,item_ref_list:{}},{gem_inst_list:"[]"},{}])refuse(extra);
  const stock=game.items[0],counter=stock.buy_cnt_gold;stock.buy_cnt_gold=0x1_0000_0000;(state as any).persist();refuse(combined);
  stock.buy_cnt_gold=counter;(state as any).persist();
  const forged=decode(immutable({...combined,target_pvid:peer.pvid,inst_id:99,item:[{inst_id:99,qty:999}],gem:[{inst_id:999}]}));
  assert.deepEqual(forged.ret_data,decoded.ret_data,"Caller fields cannot select another account or manufacture Gem synchronization");
  const authBytes=readFileSync(file);
  assert.throws(()=>gameResponse(state,"/world/RefreshInven",requested),/authenticated account required/);
  assert.throws(()=>gameResponse(state,"/world/RefreshInven",{...requested,otp:actor.otp,pvid:peer.pvid}),/account|identity|pvid/i);
  assert.deepEqual(readFileSync(file),authBytes);
  now+=3_600_000;immutable(combined);
  const loaded=games.get(actor.pvid);games.delete(actor.pvid);
  assert.notEqual(immutable(combined).result_code,1);assert.equal(games.has(actor.pvid),false);games.set(actor.pvid,loaded);
  const savedPeer=structuredClone(peerGame),bytes=readFileSync(file);
  state=new ServerState("http://localhost",file);games=(state as any).gameByPvid;game=games.get(actor.pvid);peerGame=games.get(peer.pvid);
  assert.deepEqual(decode(immutable(combined,state)).ret_data,decoded.ret_data);
  assert.deepEqual(peerGame,savedPeer);assert.deepEqual(readFileSync(file),bytes);
  assert.equal(game.items.find((row:any)=>row.inst_id==="18446744073709551615").qty,1,"Restart retains exact stored wide identity text");
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Item/combined inventory sync: actual material-to-zero/lock changes, multistack absolute DTOs, full64 numeric wire/restart, optional uint32 counters, unknown/foreign all-or-nothing refusal and strict read-only state passed.");
