import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {GEM_STAT_KEYS,parseGemCombinations,calculateGemSets} from "../src/gem-combinations.js";
import {configuredGemCombinations} from "../src/gem-combination-reference.js";
const row={id:1,count:2,rank:0,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),hp:"6.00",source_note:"AUTHORED TEST ONLY"};
const directory=mkdtempSync(path.join(tmpdir(),"blustone-gem-combinations-"));
try {
  const file=path.join(directory,"state.json"),input=[structuredClone(row)];
  const state=new ServerState("http://localhost",file,{gemCombinations:input});
  const auth=state.registerGuest({device_id:"gem-combination-fixture"},{}).ret_data as any;
  const before=readFileSync(file);
  const response=()=>gameResponse(state,"/reference/GetGemCombinationEffect",auth) as any;
  assert.throws(()=>gameResponse(state,"/reference/GetGemCombinationEffect",{}),/authenticated/);
  input[0].hp="99";
  const result=response();assert.equal(result.result_code,1);assert.equal(result.ret_data[0].hp,"6.00");
  assert.equal(result.ret_data[0].source_note,undefined,"wire fields exclude caller metadata");
  result.ret_data[0].hp="88";assert.equal(response().ret_data[0].hp,"6.00");
  const parsed=parseGemCombinations(response());
  assert.equal(calculateGemSets([1,1,1,1],parsed).stats.hp,.12,"native normalization and repeated sets, not double-scaled server wire");
  assert.deepEqual(readFileSync(file),before,"reference reads preserve saves byte-for-byte");
  const restart=new ServerState("http://localhost",file,{gemCombinations:[row]});
  assert.deepEqual((gameResponse(restart,"/reference/GetGemCombinationEffect",auth) as any).ret_data,response().ret_data);
  assert.deepEqual(readFileSync(file),before);
  for(const invalid of [null,[row,row],[{...row,count:0}],[{...row,hp:6}],[{...row,atk:"NaN"}]]) {
    assert.throws(()=>new ServerState("http://localhost",file,{gemCombinations:invalid}));
    assert.deepEqual(readFileSync(file),before);
  }
  const baseline=new ServerState();const defaultAuth=baseline.registerGuest({device_id:"gem-default"},{}).ret_data as any;
  assert.deepEqual((gameResponse(baseline,"/reference/GetGemCombinationEffect",defaultAuth) as any).ret_data,[]);
  const previous=process.env.BLUSTONE_GEM_COMBINATIONS_JSON;
  try {
    process.env.BLUSTONE_GEM_COMBINATIONS_JSON=JSON.stringify([row]);
    const envState=new ServerState();const envAuth=envState.registerGuest({device_id:"gem-env"},{}).ret_data as any;
    process.env.BLUSTONE_GEM_COMBINATIONS_JSON="[]";
    assert.equal((envState.gemCombinationReference(envAuth,{}).ret_data as any)[0].hp,"6.00");
    assert.deepEqual(configuredGemCombinations([]),[]);
  } finally {if(previous===undefined)delete process.env.BLUSTONE_GEM_COMBINATIONS_JSON;else process.env.BLUSTONE_GEM_COMBINATIONS_JSON=previous;}
} finally {rmSync(directory,{recursive:true,force:true});}
console.log("Configured Gem set tables: exact original wire units, immutable authenticated references, repeated-set arithmetic, no default invention and save-preserving restart/refusals passed; original magnitudes missing.");
