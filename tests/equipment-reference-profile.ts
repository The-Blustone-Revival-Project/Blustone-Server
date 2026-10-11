import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
import {applyEquipmentReferences} from "../src/equipment-reference-profile.js";
import {parseHunterEquipment,calculateHunterEquipment} from "../src/hunter-equipment.js";
import {ServerState} from "../src/state.js";
import {repositoryPath} from "../src/paths.js";
const rows=[{id:"AUTHORED_WEAPON",type:1,rank:1,awk_step:0,
  ...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),atk:"10000",atk_up:"2000"}];
const cards=[{base:{id:"001",res_prefix:"C001",is_source:0},equipment:[]}];
const before=JSON.stringify({cards,rows});
const result=applyEquipmentReferences(cards,{"001":rows},["C001_Q.jet"]);
assert.deepEqual(result[0].equipment,rows);
assert.equal(calculateHunterEquipment(parseHunterEquipment(result[0].equipment),0,1,1).stats.atk,100);
assert.equal(calculateHunterEquipment(parseHunterEquipment(result[0].equipment),0,1,10).stats.atk,280);
assert.equal(JSON.stringify({cards,rows}),before);
for(const raw of [null,[],{"999":rows},{"001":[{...rows[0],type:0}]},{"001":[rows[0],rows[0]]}])
  assert.throws(()=>applyEquipmentReferences(cards,raw,["C001_Q.jet"]),TypeError);
assert.throws(()=>applyEquipmentReferences(cards,{"001":rows},["C001.jet"]),/selected/);
assert.throws(()=>applyEquipmentReferences([{...cards[0],base:{...cards[0].base,is_source:1}}],{"001":rows},["C001_Q.jet"]),/nonordinary/);
const directory=mkdtempSync(path.join(tmpdir(),"blustone-equipment-reference-"));
try {
  const filename=path.join(directory,"state.json");
  const state=new ServerState("http://localhost",filename);
  const auth=state.registerGuest({device_id:"equipment-reference-preservation"},{}).ret_data as any;
  const game=state.gameFor(state.accountFor(auth,{}));
  game.starter_cards[0].exp=610;game.gold=13600;
  state.setDeck({...auth,deck_info:[{type:1,list:[game.starter_cards[0].inst_id,0,0,0]}]},{});
  const saved=readFileSync(filename);
  const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8"));
  const run=(config:string|undefined,patch:Record<string,string>={})=>{
    const env:NodeJS.ProcessEnv={...process.env,...profile.env,...patch};
    if(config===undefined) delete env.BLUSTONE_EQUIPMENT_REFERENCE_JSON;
    else env.BLUSTONE_EQUIPMENT_REFERENCE_JSON=config;
    return spawnSync(process.execPath,["--import","tsx","--input-type=module","--eval",`
      import {ServerState} from './src/state.ts'; import {gameResponse} from './src/game-routes.ts';
      const state=new ServerState('http://localhost',${JSON.stringify(filename)});
      console.log(JSON.stringify(gameResponse(state,'/reference/GetCard',{}).ret_data));
      new ServerState('http://localhost',${JSON.stringify(filename)});`],
      {cwd:repositoryPath(),env,encoding:"utf8",timeout:20000});
  };
  const defaults=run(undefined),empty=run("{}"),configured=run(JSON.stringify({"001":rows}));
  for(const child of [defaults,empty,configured]) assert.equal(child.status,0,child.stderr);
  assert.equal(defaults.stdout,empty.stdout,"empty opt-in must preserve default wire bytes");
  const expected=JSON.parse(defaults.stdout),actual=JSON.parse(configured.stdout);
  expected.find((card:any)=>card.base.id==="001").equipment=rows;
  assert.deepEqual(actual,expected,"only the requested equipment reference rows may change");
  assert.deepEqual(readFileSync(filename),saved,"owned levels, roster, stats, keys and progressed save stay exact across reads/restarts");
  assert.notEqual(run(JSON.stringify({"001":rows}),{BLUSTONE_PACKAGE_MODE:"empty"}).status,0);
  writeFileSync(path.join(directory,"C001_Q.jet"),"wrong preferred source");
  assert.notEqual(run(JSON.stringify({"001":rows}),{BLUSTONE_PACKAGE_DIR:directory}).status,0,"preferred corrupted owner cannot fall back to valid asset");
  assert.notEqual(run("[").status,0);
  assert.deepEqual(readFileSync(filename),saved);
} finally {rmSync(directory,{recursive:true,force:true});}
console.log("Configured equipment: guarded native rows/source owners, exact authored stat projection, unchanged default/other refs and whole progressed save bytes passed; no original balances or live activation.");
