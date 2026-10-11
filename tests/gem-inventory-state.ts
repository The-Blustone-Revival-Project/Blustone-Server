import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {repositoryPath} from "../src/paths.js";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
import {parseStateWithGemIds} from "../src/gem-wire.js";
const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8"));
Object.assign(process.env,profile.env);
const {ServerState}=await import("../src/state.js");
const {cardInstance}=await import("../src/bootstrap.js");
const {gameResponse}=await import("../src/game-routes.js");
const references=[{id:"AUTHORED_GEM",name:"Authored HP Gem",desc:"Local parser fixture",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1}];
const main={rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),hp:"10000"};
const gem={ref_id:references[0].id,inst_id:"9007199254740993",rank:1,level:1,position:0,target_inst_id:"0",ability:"opaque",
  abilities:{level_up_failed:0,main,sub:[{...main,hp:"0",atk:"1000"}]}};
const directory=mkdtempSync(path.join(tmpdir(),"blustone-owned-gems-"));
try {
  const filename=path.join(directory,"state.json"),options={gemReferences:references,hunterSaleProfits:[{rank:1,profit_type:2,profit_target:"",profit_qty:17}]};
  const state=new ServerState("http://localhost",filename,options);
  const auth=state.registerGuest({device_id:"owned-gem-fixture"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"other-gem-fixture"},{}).ret_data as any;
  const game=state.gameFor(state.accountFor(auth,{}));
  game.gem=12;
  (state as any).persist();
  const beforeLegacy=readFileSync(filename);
  assert.deepEqual(state.gemInventory(auth,{}).ret_data,[]);
  assert.equal(Object.hasOwn(game,"owned_gems"),false,"legacy reads never create inventory from scalar gem");
  assert.deepEqual(readFileSync(filename),beforeLegacy);
  const ref=(gameResponse(state,"/reference/GetGem",auth) as any).ret_data;
  assert.deepEqual(ref,references);ref[0].name="changed";
  assert.equal((state.gemReferenceInventory(auth,{}) as any).ret_data[0].name,references[0].name);
  game.owned_gems=[structuredClone(gem)];(state as any).persist();
  const before=readFileSync(filename);
  assert.deepEqual(parseStateWithGemIds(JSON.stringify(state.gemInventory(auth,{}).ret_data)),[gem]);
  const response=state.gemInventory(auth,{}) as any;response.ret_data[0].abilities.main.hp="0";
  assert.equal((state.gemInventory(auth,{}) as any).ret_data[0].abilities.main.hp,"10000");
  assert.deepEqual(state.gemInventory(peer,{}).ret_data,[]);
  assert.throws(()=>state.gemInventory({},{}),/authenticated/);
  assert.throws(()=>state.gemInventory({otp:auth.otp,pvid:peer.pvid},{}),/account|identity|pvid/i);
  const restart=new ServerState("http://localhost",filename,options);
  assert.deepEqual(parseStateWithGemIds(JSON.stringify(restart.gemInventory(auth,{}).ret_data)),[gem]);assert.deepEqual(readFileSync(filename),before);
  assert.throws(()=>new ServerState("http://localhost",filename,{gemReferences:[]}),/reference/);
  assert.deepEqual(readFileSync(filename),before,"unknown owned reference cannot erase prior source bytes");
  // Simulated imported mounted row: no mount API or invented position policy.
  const restored=restart.gameFor(restart.accountFor(auth,{}));
  restored.recruited_cards.push({...cardInstance(1000200,"001",1),lock:0});restored.next_card_inst_id=1000300;
  restored.owned_gems![0].target_inst_id="1000200";restored.owned_gems![0].position=1;(restart as any).persist();
  const mountedBytes=readFileSync(filename),mountedBefore=JSON.stringify(restored);
  assert.equal(restart.sellCards({...auth,inst_id_list:[1000200]},{}).result_code,2001);
  assert.equal(restart.trainCard({...auth,target_inst_id:restored.starter_cards[0].inst_id,source_inst_list:[1000200]},{}).result_code,2001,
    "mounted Hunter cannot be silently consumed as training material");
  assert.equal(JSON.stringify(restored),mountedBefore);assert.deepEqual(readFileSync(filename),mountedBytes);
  assert.equal(restart.unavailableGemAction(auth,{}).result_code,2001);
  const mountedRestart=new ServerState("http://localhost",filename,options);
  assert.equal((mountedRestart.gemInventory(auth,{}) as any).ret_data[0].target_inst_id,"1000200");
  assert.deepEqual(readFileSync(filename),mountedBytes);
} finally {rmSync(directory,{recursive:true,force:true});}
console.log("Owned Gem state: explicit references/original art, raw full inventory and uint64 IDs, legacy scalar separation, auth, byte-preserving restart, missing-reference refusal and mounted-Hunter protection passed; no grants/mounts.");
