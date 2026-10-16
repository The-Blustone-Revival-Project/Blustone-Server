import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE="catalogue-birth-rank-projection";
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const {starterReference,starterInventory,cardInstance,referenceRecruitRank}=await import("../src/bootstrap.js");
const {projectHunterMinimumRanks,catalogueBirthRanks}=await import("../src/hunter-minimum-rank.js");
const {searchHelperReference}=await import("../src/search-helpers.js");
const directory=mkdtempSync(path.join(tmpdir(),"blustone-min-rank-")),clock=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  const ranks=[1,2,3,4,5].map(rank=>({rank,awk_step:0,hp:"unchanged"}));
  const references=[{base:{id:"003",is_main:0},stat:structuredClone(ranks)},
    {base:{id:"001",is_main:1},stat:structuredClone(ranks)},
    {base:{id:"001_1",is_main:0},stat:structuredClone(ranks)},
    {base:{id:"999",is_main:0},stat:structuredClone(ranks)}];
  const before=structuredClone(references),projected=projectHunterMinimumRanks(references,"catalogue-birth-rank-projection");
  assert.deepEqual(projected[0].stat,ranks.slice(2));assert.deepEqual(projected.slice(1),references.slice(1),"Main alias, awakened and unknown identities stay unchanged");
  assert.deepEqual(references,before);assert.notEqual(projected[0].stat[0],references[0].stat[2]);
  assert.deepEqual(projectHunterMinimumRanks(references,"legacy"),references);
  assert.throws(()=>projectHunterMinimumRanks(references,"unknown"));
  assert.throws(()=>projectHunterMinimumRanks([{base:{id:"003"},stat:ranks.slice().reverse()}],"catalogue-birth-rank-projection"),/ordered/);
  assert.throws(()=>projectHunterMinimumRanks([{base:{id:"003"},stat:ranks.filter(row=>row.rank!==4)}],"catalogue-birth-rank-projection"),/coverage/);
  const births=catalogueBirthRanks();assert.equal(births.get("002"),2);assert.equal(births.get("003"),3);
  for(const [id,first] of [["001",1],["002",2],["003",3],["004",1],["005",2],["006",1]] as const) {
    const ref=starterReference.find(row=>row.base.id===id)!;assert.equal(ref.stat[0].rank,first);
    assert.equal(cardInstance(777,id).rank,first,"Default transient factories must retain stat coverage");
  }
  assert.equal(starterInventory.find(row=>row.ref_id==="001")!.rank,1);
  assert.equal(starterInventory.find(row=>row.ref_id==="002")!.rank,2);
  const helper=searchHelperReference();
  assert.equal(helper.virtual_friend[0].rank,1,"Fixed Search helper is main001 alias; catalogue Lantern rarity must not change it");
  const file=path.join(directory,"projected.json"),state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"minimum-owner"},{}).ret_data as any;
  const game=(state as any).gameByPvid.get(actor.pvid),owned=game.starter_cards;
  assert.equal(owned.find((row:any)=>row.ref_id==="001").rank,1);assert.equal(owned.find((row:any)=>row.ref_id==="002").rank,2);
  assert.deepEqual(gameResponse(state,"/reference/GetCard",{}).ret_data,starterReference);
  for(const [id,rank] of [["002",2],["003",3]] as const) {
    process.env.BLUSTONE_RECRUIT_CARD=id;
    const pull=state.gachaPremium({...actor,cnt:1},{}).ret_data as any;
    assert.equal(pull.cnt,1);assert.equal(pull.card.ref_id,id);assert.equal(pull.card.rank,rank);assert.equal(referenceRecruitRank(id),rank);
  }
  const snapshot=structuredClone(game),bytes=readFileSync(file);
  const restored=new ServerState("http://localhost",file);assert.deepEqual((restored as any).gameByPvid.get(actor.pvid),snapshot);assert.deepEqual(readFileSync(file),bytes);
  // Build baseline in another process so import-time profile selection is real.
  const legacy=path.join(directory,"legacy.json"),refsFile=path.join(directory,"legacy-refs.json");
  const script=`import {writeFileSync} from 'node:fs';const {ServerState}=await import(${JSON.stringify(new URL("../src/state.js",import.meta.url).href)});const {starterReference}=await import(${JSON.stringify(new URL("../src/bootstrap.js",import.meta.url).href)});const s=new ServerState('http://localhost',process.argv[1]);s.registerGuest({device_id:'old'},{});writeFileSync(process.argv[2],JSON.stringify(starterReference));`;
  const seed=spawnSync(process.execPath,["--import","tsx","--input-type=module","-e",script,legacy,refsFile],
    {encoding:"utf8",env:{...process.env,BLUSTONE_HUNTER_MIN_RANK_PROFILE:"legacy"}});
  assert.equal(seed.status,0,seed.stderr);const legacyBytes=readFileSync(legacy);
  const priorRefs=JSON.parse(readFileSync(refsFile,"utf8"));
  for(const current of starterReference) {
    const prior=priorRefs.find((row:any)=>row.base.id===current.base.id)!;
    const expected=current.is_main===1?prior.stat:prior.stat.filter((row:any)=>row.rank>=(births.get(current.base.id)??prior.stat[0].rank));
    assert.deepEqual(current.stat,expected,"Every retained stat and growth value equals legacy; only unavailable grades are removed");
  }
  assert.throws(()=>new ServerState("http://localhost",legacy),/minimum-rank projection.*Refusing/);assert.deepEqual(readFileSync(legacy),legacyBytes);
  // Rank2 legacy Mowgli is already compatible; selecting the profile must not
  // rewrite fields, journals, clocks, skills, rank or save bytes.
  const compatible=JSON.parse(legacyBytes.toString());compatible.gameStates[0][1].starter_cards.find((row:any)=>row.ref_id==="002").rank=2;
  writeFileSync(legacy,JSON.stringify(compatible));const compatibleBytes=readFileSync(legacy);
  const admitted=new ServerState("http://localhost",legacy);assert.deepEqual(readFileSync(legacy),compatibleBytes);
  assert.deepEqual((admitted as any).gameByPvid.get(compatible.accounts[0].pvid).starter_cards,compatible.gameStates[0][1].starter_cards);
  const legacyProbe=`const{ServerState}=await import(${JSON.stringify(new URL("../src/state.js",import.meta.url).href)});new ServerState('http://localhost',process.argv[1]);`;
  const fallback=spawnSync(process.execPath,["--import","tsx","--input-type=module","-e",legacyProbe,file],
    {encoding:"utf8",env:{...process.env,BLUSTONE_HUNTER_MIN_RANK_PROFILE:"legacy"}});
  assert.equal(fallback.status,0,fallback.stderr);assert.deepEqual(readFileSync(file),bytes,"Returning to legacy preserves earned higher grades");
  const materialScript=`import assert from 'node:assert/strict';const{ServerState}=await import(${JSON.stringify(new URL("../src/state.js",import.meta.url).href)});const{starterReference,referenceRecruitRank}=await import(${JSON.stringify(new URL("../src/bootstrap.js",import.meta.url).href)});const added=starterReference.filter(r=>!['001','002','003','004','005','006'].includes(r.base.id)&&r.stat[0].rank>=2);assert.ok(added.length);const s=new ServerState('http://localhost');const a=s.registerGuest({device_id:'material-minimum'},{}).ret_data;for(const r of added){assert.equal(referenceRecruitRank(r.base.id),r.stat[0].rank);process.env.BLUSTONE_RECRUIT_CARD=r.base.id;const result=s.gachaPremium({...a,cnt:1},{}).ret_data;assert.equal(result.cnt,1);assert.equal(result.card.rank,r.stat[0].rank);}`;
  const materialNames=["009","010","012","013","017","036","040","049"].flatMap(id=>["","_Q","_EFT","_SND"].map(suffix=>`C${id}${suffix}.jet`)).join(",");
  const material=spawnSync(process.execPath,["--import","tsx","--input-type=module","-e",materialScript],
    {encoding:"utf8",env:{...process.env,BLUSTONE_CARD_REFERENCE_PROFILE:"materials",BLUSTONE_PACKAGE_NAMES:materialNames}});
  assert.equal(material.status,0,material.stderr);
  console.log("Hunter minimum-rank projection: community first-row grades, unchanged retained stats/main/helper, fresh factories/recruitment, compatible restart and exact refusal of lower-grade legacy ownership passed; no ticket settlement");
}finally{Date.now=clock;rmSync(directory,{recursive:true,force:true});}
