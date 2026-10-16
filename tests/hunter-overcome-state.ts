import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {cardInstance} from "../src/bootstrap.js";

// Authored LOCAL recipes and stock: no historical balance or issuance claim.
const policy={effect:[1,2,3].map(cnt=>({cnt,hp_percent:cnt*3,atk_percent:cnt*4,def_percent:cnt*5})),
  src:[1,2,3,4].flatMap(target_base_rank=>[1,2,3].map(overcome_cnt=>({target_base_rank,overcome_cnt,card_required_rank:1,card_cnt:1,item_list:[{ref_id:"local_overcome_stone",qty:3}],gold:17}))),
  items:[{id:"local_overcome_stone",name:"Authored stone",desc:"Local fixture",use_type:0,effect:"",thumbnail_id:"",rank:1,sell_price:0,collect_qty:0}]};
const options={hunterOvercomeMode:"local-configured",hunterOvercomePolicy:policy} as const;
const folder=mkdtempSync(path.join(tmpdir(),"blustone-overcome-state-")),file=path.join(folder,"state.json");
try {
  let state=new ServerState("http://localhost",file,options);
  const actor=state.registerGuest({device_id:"overcome-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"overcome-peer"},{}).ret_data as any;
  let game=(state as any).gameByPvid.get(actor.pvid);
  game.recruited_cards=[{...cardInstance(1000100,"003",5),exp:123,overcome_cnt:0},...[1,2,3].map(i=>({...cardInstance(1000100+i,"003",3),lock:0}))];
  game.next_card_inst_id=1000104;game.gold=100;
  game.items=[{inst_id:42,ref_id:"local_overcome_stone",qty:2,lock:0},{inst_id:"9007199254740993",ref_id:"local_overcome_stone",qty:8,lock:0},
    {inst_id:44,ref_id:"local_overcome_stone",qty:100,lock:1}];
  game.dorm_expansion={capacity:103,manda:1,gold:0};
  const day=Math.floor(Date.now()/86400000),owner=(state as any).accountsByPvid.get(actor.pvid);
  game.fuel_shop={day,manda:1,gold:0,coupon:1};
  owner.rupeeShopCounter={day,manda:1,coupon:0};owner.profileSettings={info_message:"Preserved through transcendence",rename_count:1};
  (state as any).persist();assert.equal(JSON.parse(readFileSync(file,"utf8")).version,10);
  const peerBefore=structuredClone((state as any).gameByPvid.get(peer.pvid));
  const upgrade=(source=1000101)=>state.overcomeHunter({...actor,target_inst_id:1000100,src_inst_id_list:JSON.stringify([source])},{}) as any;
  const snapshot=()=>({json:JSON.stringify(game),bytes:readFileSync(file),capture:(state as any).capturedOvercomePolicy,
    arrays:[game.items,game.starter_cards,game.recruited_cards,game.decks],target:game.recruited_cards[0]});
  const exact=(before:ReturnType<typeof snapshot>)=>{assert.equal(JSON.stringify(game),before.json);assert.deepEqual(readFileSync(file),before.bytes);
    assert.equal((state as any).capturedOvercomePolicy,before.capture);[game.items,game.starter_cards,game.recruited_cards,game.decks].forEach((row,i)=>assert.equal(row,before.arrays[i]));assert.equal(game.recruited_cards[0],before.target);};
  const failures=(source:number)=>{
    const before=snapshot();mkdirSync(file+".tmp");try{assert.throws(()=>upgrade(source),/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}exact(before);
    const blocked=file+"-blocked";mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>upgrade(source),/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}exact(before);
  };
  assert.equal((state as any).capturedOvercomePolicy,undefined);failures(1000101);
  const before=structuredClone(game),result=upgrade();assert.equal(result.result_code,1);
  assert.deepEqual(result.ret_data.target,{inst_id:1000100,overcome_cnt:1});assert.deepEqual(result.ret_data.removed_card,[1000101]);
  assert.deepEqual(result.ret_data.user.gold,{prev:100,cur:83});assert.ok(Array.isArray(result.ret_data.user.deck));
  assert.equal(game.items[0].qty,0);assert.equal(game.items[1].qty,7);assert.equal(game.items[2].qty,100);
  const expected=structuredClone(before);expected.gold=83;expected.items[0].qty=0;expected.items[1].qty=7;
  expected.recruited_cards.splice(1,1);expected.recruited_cards[0].overcome_cnt=1;assert.deepEqual(game,expected);
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,11);failures(1000102);
  assert.equal(upgrade(1000102).result_code,1);assert.equal(upgrade(1000103).result_code,1);
  assert.equal(game.gold,49);assert.equal(game.recruited_cards[0].overcome_cnt,3);const capped=snapshot();assert.equal(upgrade().result_code,2001);exact(capped);
  assert.deepEqual((state as any).gameByPvid.get(peer.pvid),peerBefore);
  const saved=JSON.parse(readFileSync(file,"utf8")),bytes=readFileSync(file);
  state=new ServerState("http://localhost",file,{hunterOvercomeMode:"disabled",hunterOvercomePolicy:undefined});game=(state as any).gameByPvid.get(actor.pvid);
  assert.deepEqual((state as any).accountsByPvid.get(actor.pvid).rupeeShopCounter,owner.rupeeShopCounter);
  assert.deepEqual((state as any).accountsByPvid.get(actor.pvid).profileSettings,owner.profileSettings);assert.equal(game.fuel_shop.coupon,1);
  assert.deepEqual(state.hunterOvercomeReference(),{effect:policy.effect,src:policy.src});assert.equal(upgrade().result_code,2001);assert.deepEqual(readFileSync(file),bytes);
  assert.deepEqual(state.itemReferenceRows().item.find(row=>row.id==="local_overcome_stone"),policy.items[0]);
  state.registerGuest({device_id:"unrelated-later"},{});assert.equal(JSON.parse(readFileSync(file,"utf8")).version,11);
  // Legitimate later removal of the last upgraded Hunter must retain its ledger.
  game.recruited_cards=[];(state as any).persist();new ServerState("http://localhost",file);
  writeFileSync(file,JSON.stringify(saved));
  const reordered=structuredClone(policy);reordered.src.reverse();reordered.effect.reverse();
  new ServerState("http://localhost",file,{...options,hunterOvercomePolicy:reordered});
  for(const alter of [(p:typeof policy)=>p.effect[0].hp_percent++, (p:typeof policy)=>p.src[0].gold++, (p:typeof policy)=>p.items[0].name+=" changed"]){
    const changed=structuredClone(policy);alter(changed);const original=readFileSync(file);assert.throws(()=>new ServerState("http://localhost",file,{...options,hunterOvercomePolicy:changed}),/differs from captured/);assert.deepEqual(readFileSync(file),original);
  }
  for(let version=1;version<=10;version++){const invalid=structuredClone(saved);invalid.version=version;writeFileSync(file,JSON.stringify(invalid));const original=readFileSync(file);
    assert.throws(()=>new ServerState("http://localhost",file),/schema11|Unsupported or malformed/);assert.deepEqual(readFileSync(file),original);}
  const missing=structuredClone(saved);delete missing.hunterOvercomePolicy;writeFileSync(file,JSON.stringify(missing));assert.throws(()=>new ServerState("http://localhost",file),/Schema11/);
  const legacy=structuredClone(saved);legacy.version=10;delete legacy.hunterOvercomePolicy;writeFileSync(file,JSON.stringify(legacy));const original=readFileSync(file);
  new ServerState("http://localhost",file);assert.throws(()=>new ServerState("http://localhost",file,options),/no bound effect policy/);assert.deepEqual(readFileSync(file),original);
  console.log("Hunter Overcome state: first/later write+rename rollback, exact combined settlement, cap, schema11 compatibility, immutable policy and disabled retention passed");
} finally {rmSync(folder,{recursive:true,force:true});}
