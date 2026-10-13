import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8"));Object.assign(process.env,profile.env);
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const ref={id:"AUTHORED_GEM",name:"Authored",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1};
const prices=[{level:7,price_type:2,price:11},{level:9,price_type:2,price:17}];
const dir=mkdtempSync(path.join(tmpdir(),"blustone-gem-replacement-"));
try {
  const file=path.join(dir,"state.json"),options={gemReferences:[ref],gemDisassemblePrices:structuredClone(prices)};
  const state=new ServerState("http://localhost",file,options);
  const auth=state.registerGuest({device_id:"gem-replacement"},{}).ret_data as any;
  const game=state.gameFor(state.accountFor(auth,{})),target=game.starter_cards[0];target.weapon_rank=3;game.gold=100;
  const peer=state.registerGuest({device_id:"gem-peer"},{}).ret_data as any;
  const peerBefore=JSON.stringify(state.gameFor(state.accountFor(peer,{})));
  game.owned_gems=[{inst_id:"9007199254740993",ref_id:ref.id,rank:1,level:7,position:1,target_inst_id:String(target.inst_id),ability:"opaqueA",abilities:null},
    {inst_id:"18446744073709551615",ref_id:ref.id,rank:1,level:9,position:2,target_inst_id:String(target.inst_id),ability:"opaqueB",abilities:null}];
  (state as any).persist();
  const unrelated=JSON.stringify({...game,gold:undefined,owned_gems:undefined});
  const call=(cells:unknown[],extra={})=>state.equipGems({...auth,target_inst_id:String(target.inst_id),price_type:2,
    combination:JSON.stringify({weapons:cells,armors:[0,0],accessories:[0,0]}),...extra},{}) as any;
  const refuse=(cells:unknown[],extra={})=>{const bytes=readFileSync(file),memory=JSON.stringify(game);
    assert.equal(call(cells,extra).result_code,2001);assert.deepEqual(readFileSync(file),bytes);assert.equal(JSON.stringify(game),memory);};
  assert.throws(()=>state.gemDisassembleReference({},{}),/authenticated/);
  options.gemDisassemblePrices[0].price=999;
  const quote=state.gemDisassembleReference(auth,{}).ret_data as any;assert.equal(quote[0].price,11);
  quote[0].price=888;assert.equal((state.gemDisassembleReference(auth,{}).ret_data as any)[0].price,11);
  refuse([0,0],{price_type:4});
  assert.throws(()=>call([0,0],{pvid:peer.pvid}),/pvid does not match/);
  game.gold=27;refuse([0,0]);game.gold=100;
  const originalGems=game.owned_gems,originalPersist=(state as any).persist;
  (state as any).persist=()=>{throw new Error("fixture disk failure");};
  assert.throws(()=>call([0,0]),/disk failure/);assert.equal(game.owned_gems,originalGems);assert.equal(game.gold,100);
  (state as any).persist=originalPersist;
  const result=call([0,0]);assert.equal(result.result_code,1);assert.equal(result.ret_data.user.gold.cur,72);
  assert.equal(result.ret_data.gems.length,2);assert.ok(result.ret_data.gems.every((gem:any)=>gem.target_inst_id==="0"&&gem.position===0));
  const settled=readFileSync(file),retry=call([0,0]);assert.equal(retry.ret_data.user.gold.cur,72);
  assert.deepEqual(retry.ret_data.gems,result.ret_data.gems,"lost removal response repaired by authoritative rows on retry");
  assert.deepEqual(readFileSync(file),settled,"no-op retries do not spend or persist");
  assert.equal(JSON.stringify({...game,gold:undefined,owned_gems:undefined}),unrelated);
  assert.equal(JSON.stringify((state as any).gameByPvid.get(peer.pvid)),peerBefore);
  const restart=new ServerState("http://localhost",file,{gemReferences:[ref],gemDisassemblePrices:prices});
  assert.equal(restart.gameFor(restart.accountFor(auth,{})).gold,72);
  assert.deepEqual(restart.gameFor(restart.accountFor(auth,{})).owned_gems,game.owned_gems);assert.deepEqual(readFileSync(file),settled);
  assert.throws(()=>new ServerState("http://localhost",file,{...options,gemDisassemblePrices:[prices[0],prices[0]]}),/Duplicate/);
  assert.deepEqual(readFileSync(file),settled);
  const missing=new ServerState("http://localhost",file,{gemReferences:[ref]});
  const missingGame=missing.gameFor(missing.accountFor(auth,{}));missingGame.owned_gems![0].target_inst_id=String(target.inst_id);missingGame.owned_gems![0].position=1;
  const missingBefore=JSON.stringify(missingGame);
  assert.equal((gameResponse(missing,"/card_handler/EquipGem",{...auth,target_inst_id:String(target.inst_id),price_type:2,
    combination:JSON.stringify({weapons:[0,0],armors:[0,0],accessories:[0,0]})}) as any).result_code,2001);
  assert.equal(JSON.stringify(missingGame),missingBefore);assert.deepEqual(readFileSync(file),settled);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Configured Gem replacement state: immutable old-level quotes, authenticated atomic debit/removal, no-op lost-response repair, rollback, byte-preserving restart and unrelated-state protection passed; original fees unknown.");
