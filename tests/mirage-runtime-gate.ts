import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {createApp} from "../src/server.js";
import {repositoryPath} from "../src/paths.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-mirage-gate-")),file=path.join(directory,"state.json");
const previous={...process.env},profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-mirage.json"),"utf8"));
const enemy={ref_id:"003",hp_percent:10000,rank:3,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:0,skill_5_level:0};
const policy={enrollment:"rank-exp-id-projection",floor:1,bg_res:"MIRAGE_BG_G",dlg_begin:"",dlg_end:"",res_prefix:"MRG",res_postfix_list:["002"],
  stairs:Array.from({length:3},()=>({grade:0,balance:10000,enemies:[enemy],gold:1})),hero:{bonus:0,end_ltime:2147483647,cur:[],next:[]}};
const configure=()=>{
  for(const key of Object.keys(process.env))if(key.startsWith("BLUSTONE_"))delete process.env[key];
  Object.assign(process.env,profile.env);
  for(const key of ["BLUSTONE_PACKAGE_DIR","BLUSTONE_RESOURCE_ASSET_DIR","BLUSTONE_PACKAGE_TREE_DIR","BLUSTONE_CATALOG_PATH"])process.env[key]=repositoryPath(profile.env[key]);
  process.env.BLUSTONE_STATE_FILE=file;
};
try {
  writeFileSync(file,'{"retained":"invalid fixture must not be read before gate"}');const original=readFileSync(file);
  for(const name of ["MIRAGE.jet","ST002.jet","LEVELING.jet"]){configure();process.env.BLUSTONE_PACKAGE_NAMES=process.env.BLUSTONE_PACKAGE_NAMES!.split(",").filter(value=>value!==name).join(",");
    assert.throws(()=>createApp({stateFile:file,mirageMode:"local-configured",miragePolicy:policy}),/requires selected original/);assert.deepEqual(readFileSync(file),original);}
  for(const changes of [{BLUSTONE_PACKAGE_MODE:"empty"},{BLUSTONE_RESLIST_HEADER_STAMP:"1"},{BLUSTONE_RESOURCE_VERSION:"01"}]){
    configure();Object.assign(process.env,changes);assert.throws(()=>createApp({stateFile:file,mirageMode:"local-configured",miragePolicy:policy}),/coherent original CDN/);assert.deepEqual(readFileSync(file),original);}
  configure();process.env.BLUSTONE_PACKAGE_DIR=directory;writeFileSync(path.join(directory,"MIRAGE.jet"),"WRONG ORIGINAL");
  assert.throws(()=>createApp({stateFile:file,mirageMode:"local-configured",miragePolicy:policy}),/Conflicting Mirage runtime/);assert.deepEqual(readFileSync(file),original);
  configure();rmSync(file);const {state}=createApp({stateFile:file,mirageMode:"local-configured",miragePolicy:policy});
  assert.equal(existsSync(file),false,"Configuration/asset readiness creates no account or journal");
  const actor=state.registerGuest({device_id:"mirage-gate-owner"},{}).ret_data as any;
  assert.equal((state.mirageAction("/mirage/GetInfo",actor,{}) as any).result_code,1);
  const captured=readFileSync(file);configure();process.env.BLUSTONE_PACKAGE_NAMES=process.env.BLUSTONE_PACKAGE_NAMES!.replace(",MIRAGE.jet","");
  assert.throws(()=>createApp({stateFile:file,mirageMode:"disabled"}),/requires selected original/);assert.deepEqual(readFileSync(file),captured,"Mode-off retained caches still require assets");
  console.log("Mirage startup: selected original packs/coherent CDN required before enabled state reads, conflicting copies refuse, config grants nothing, and mode-off captured runs retain resource readiness passed");
}finally{
  for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);
  rmSync(directory,{recursive:true,force:true});
}
