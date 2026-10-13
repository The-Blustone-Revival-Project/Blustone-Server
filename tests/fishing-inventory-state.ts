import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {ownedFishingInventory} from "../src/fishing-inventory.js";
// Authored disposable historical snapshot. No original catalogue or catch grant.
const item={id:"AUTHORED_FISH",name:"",desc:"",thumbnail_id:"",effect:"",rank:1,use_type:0,sell_price:0,collect_qty:0};
const row={fish_id:item.id,b_cnt:3,s_cnt:2,g_cnt:1};
const dir=mkdtempSync(path.join(tmpdir(),"blustone-owned-fish-"));
try {
  const file=path.join(dir,"state.json"),options={fishingItems:[item]};
  const state=new ServerState("http://localhost",file,options);
  const auth=state.registerGuest({device_id:"fish-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"fish-peer"},{}).ret_data as any;
  const game=state.gameFor(state.accountFor(auth,{})),other=state.gameFor(state.accountFor(peer,{}));
  assert.equal(game.owned_fish,undefined,"References never create ownership");
  game.owned_fish=[{...row}];(state as any).persist();
  const bytes=readFileSync(file),before=JSON.stringify(game),peerBefore=JSON.stringify(other);
  const read=(current:ServerState,actor=auth)=>gameResponse(current,"/fishing/GetInven",actor) as any;
  assert.deepEqual(read(state).ret_data,[row]);
  read(state).ret_data[0].b_cnt=999;
  assert.deepEqual(read(state).ret_data,[row]);assert.deepEqual(read(state,peer).ret_data,[]);
  assert.throws(()=>read(state,{}),/authenticated/);
  assert.throws(()=>read(state,{otp:auth.otp,pvid:peer.pvid}),/identity|pvid|account/i);
  assert.equal((gameResponse(state,"/fishing/SellFish",{...auth,fish_id:item.id,grade:"1",qty:"3"}) as any).result_code,2001);
  assert.equal(JSON.stringify(game),before);assert.equal(JSON.stringify(other),peerBefore);assert.deepEqual(readFileSync(file),bytes);
  const restart=new ServerState("http://localhost",file,options);
  assert.deepEqual(read(restart).ret_data,[row]);assert.deepEqual(readFileSync(file),bytes);
  const fishTypeRestart=new ServerState("http://localhost",file,{fishingItems:[{...item,use_type:17}]});
  assert.deepEqual(read(fishTypeRestart).ret_data,[row]);assert.deepEqual(readFileSync(file),bytes);
  const unavailable=new ServerState("http://localhost",file);
  assert.equal(read(unavailable).result_code,2001,"Missing metadata cannot substitute a false empty ownership read");
  assert.deepEqual(readFileSync(file),bytes);
  const clone=ownedFishingInventory([row]);clone[0].b_cnt=0;assert.equal(row.b_cnt,3);
  assert.deepEqual(ownedFishingInventory([{fish_id:item.id,b_cnt:0x7fff_ffff,s_cnt:0x7fff_ffff,g_cnt:0xffff_ffff}])[0].g_cnt,0xffff_ffff);
  for(const patch of [{fish_id:""},{fish_id:"bad\ud800"},{b_cnt:-1},{b_cnt:0x8000_0000},
    {s_cnt:0x8000_0000},{g_cnt:0x1_0000_0000},{g_cnt:"1"},{s_cnt:undefined}])
    assert.throws(()=>ownedFishingInventory([{...row,...patch}]));
  assert.throws(()=>ownedFishingInventory([row,row]),/Duplicate/);
  assert.throws(()=>ownedFishingInventory([{...row,provenance:"unsupported retained field"}]),/discard imported data/);
  assert.throws(()=>ownedFishingInventory([row],new Set()),/definition/);
  const invalidFile=path.join(dir,"invalid.json");
  // Exercise malformed persistence with the exact serialized key independent of pretty printing.
  const parsed=JSON.parse(bytes.toString());
  const serialized=JSON.stringify(parsed).replace('"b_cnt":3','"b_cnt":-1');
  writeFileSync(invalidFile,serialized);
  assert.throws(()=>new ServerState("http://localhost",invalidFile,options),/inventory b_cnt/);
  assert.equal(readFileSync(invalidFile,"utf8"),serialized);
  const extended=JSON.stringify(parsed).replace('"b_cnt":3','"provenance":"retained","b_cnt":3');
  writeFileSync(invalidFile,extended);
  assert.throws(()=>new ServerState("http://localhost",invalidFile,options),/discard imported data/);
  assert.equal(readFileSync(invalidFile,"utf8"),extended);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Owned fishing inventory: explicit snapshots only, exact grade counts, authenticated owner isolation, no metadata grants/sale, detached reads and lossless persistence/refusal passed.");
