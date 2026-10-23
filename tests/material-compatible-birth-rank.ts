import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repositoryPath} from "../src/paths.js";
import {MATERIAL_CATALOGUE_BIRTH_IDS,projectHunterMinimumRanks} from "../src/hunter-minimum-rank.js";
import {MATERIAL_ARCHIVE_IDS} from "../src/material-stat-projection.js";

const mode="material-catalogue-birth-rank-projection",directory=mkdtempSync(path.join(tmpdir(),"blustone-material-birth-"));
try {
  const fullPath=repositoryPath("config/profiles/current-e6-materials-progression.json"),fullBytes=readFileSync(fullPath);
  const full=JSON.parse(fullBytes.toString("utf8")),candidate=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials-compatible-progression.json"),"utf8"));
  assert.deepEqual({...candidate,name:full.name,source:full.source,env:{...candidate.env,BLUSTONE_HUNTER_MIN_RANK_PROFILE:full.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE}},full,
    "Only name/source and the explicit partial minimum-rank mode change");
  assert.equal(candidate.expectedPackages,139);assert.equal(candidate.resourceStamp,"1634683");assert.equal(candidate.preparedOnly,true);
  assert.deepEqual(MATERIAL_CATALOGUE_BIRTH_IDS,MATERIAL_ARCHIVE_IDS);assert.equal(MATERIAL_CATALOGUE_BIRTH_IDS.length,8);
  assert.throws(()=>{(MATERIAL_CATALOGUE_BIRTH_IDS as any).push("002");});
  const ranks=[1,2,3,4,5].map(rank=>({rank,awk_step:0,hp:"source value",hp_up:"unchanged growth"}));
  const otherRefs=[{base:{id:"001",is_main:1},stat:structuredClone(ranks)},{base:{id:"002",is_main:0},stat:structuredClone(ranks)},
    {base:{id:"003",is_main:0},stat:structuredClone(ranks)},{base:{id:"004",is_main:0},stat:structuredClone(ranks)},
    {base:{id:"005",is_main:0},stat:structuredClone(ranks)},{base:{id:"006",is_main:0},stat:structuredClone(ranks)},
    {base:{id:"999",is_main:0},stat:structuredClone(ranks)},{base:{id:"013_1",is_main:0},stat:structuredClone(ranks)}];
  const unchanged=projectHunterMinimumRanks(otherRefs,mode);
  assert.deepEqual(unchanged,otherRefs);unchanged.forEach((row,index)=>assert.equal(row,otherRefs[index],"Unselected references remain the same objects"));
  assert.throws(()=>projectHunterMinimumRanks(otherRefs,"unknown"),/Unknown/);
  for(const stat of [ranks.filter(row=>row.rank!==3),[...ranks].reverse(),ranks.filter(row=>row.rank<2)])
    assert.throws(()=>projectHunterMinimumRanks([{base:{id:"013",is_main:0},stat}],mode),/ordered|coverage/);

  const baseline=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8"));
  const compiled=import.meta.url.endsWith(".js"),prefix=compiled?"dist/":"",extension=compiled?"js":"ts";
  const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith("BLUSTONE_")));
  const run=(profile:any,code:string,override:Record<string,string>={})=>spawnSync(process.execPath,
    [...(compiled?[]:["--import","tsx"]),"--input-type=module","--eval",code],
    {cwd:repositoryPath(),env:{...cleanEnv,...profile.env,...override},encoding:"utf8",timeout:30_000});
  const source=(module:string)=>`./${prefix}src/${module}.${extension}`;
  const file=path.join(directory,"three-legacy-owners.json");
  const seed=run(baseline,`
    import assert from 'node:assert/strict';
    import {ServerState} from '${source("state")}';
    import {starterReference} from '${source("bootstrap")}';
    Date.now=()=>1800000000000;
    const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const auth=[0,1,2].map(index=>state.registerGuest({device_id:'material-legacy-'+index},{}).ret_data);
    for(const actor of auth) {
      const game=state.gameFor(state.accountFor(actor,{}));
      assert.equal(game.starter_cards.find(card=>card.ref_id==='001').rank,1);
      assert.equal(game.starter_cards.find(card=>card.ref_id==='002').rank,1);
    }
    console.log(JSON.stringify({auth,refs:starterReference}));`);
  assert.equal(seed.status,0,seed.stderr);const old=JSON.parse(seed.stdout),legacyBytes=readFileSync(file),legacyState=JSON.parse(legacyBytes.toString());
  const readOnly=run(candidate,`
    import assert from 'node:assert/strict';
    import {ServerState} from '${source("state")}';
    import {starterReference,referenceRecruitRank} from '${source("bootstrap")}';
    Date.now=()=>1800000000000;
    new ServerState('http://localhost',${JSON.stringify(file)});
    assert.throws(()=>new ServerState('http://localhost',${JSON.stringify(file)},{quickAdvancementMode:'local-owned-tickets'}),/requires the catalogue minimum-rank profile/);
    console.log(JSON.stringify({refs:starterReference,births:Object.fromEntries(${JSON.stringify([...MATERIAL_CATALOGUE_BIRTH_IDS])}.map(id=>[id,referenceRecruitRank(id)]))}));`);
  assert.equal(readOnly.status,0,readOnly.stderr);assert.deepEqual(readFileSync(file),legacyBytes,"Three supported old owners load without a rewrite");
  const next=JSON.parse(readOnly.stdout),oldSix=old.refs.filter((row:any)=>["001","002","003","004","005","006"].includes(row.base.id));
  assert.deepEqual(next.refs.filter((row:any)=>["001","002","003","004","005","006"].includes(row.base.id)),oldSix,
    "First-six stats, rank coverage, base, equipment, skills and dialogues remain byte-equivalent");
  assert.deepEqual(next.births,{"009":1,"010":4,"012":3,"013":2,"017":1,"036":3,"040":3,"049":3});
  const global=run(full,`import {starterReference} from '${source("bootstrap")}';console.log(JSON.stringify(starterReference));`);
  assert.equal(global.status,0,global.stderr);const fullRefs=JSON.parse(global.stdout);
  for(const id of MATERIAL_CATALOGUE_BIRTH_IDS)assert.deepEqual(next.refs.find((row:any)=>row.base.id===id),fullRefs.find((row:any)=>row.base.id===id),
    "Selected material reference retains exact existing full-profile numeric/growth/skill fields and grade coverage");
  const paid=run(candidate,`
    import assert from 'node:assert/strict';
    import {ServerState} from '${source("state")}';
    Date.now=()=>1800000000000;process.env.BLUSTONE_RECRUIT_CARD='013';
    const state=new ServerState('http://localhost',${JSON.stringify(file)}),actor=${JSON.stringify(old.auth[0])};
    const draw=state.gachaPremium({...actor,cnt:1,item_inst_id:0},{});
    assert.equal(draw.result_code,1);assert.equal(draw.ret_data.cnt,1);assert.equal(draw.ret_data.card.ref_id,'013');assert.equal(draw.ret_data.card.rank,2);
    process.env.BLUSTONE_RECRUIT_CARD='999';
    const unknown=state.gachaPremium({...actor,cnt:1,item_inst_id:0},{});assert.equal(unknown.ret_data.cnt,0);assert.equal(unknown.ret_data.card,null);
    console.log(JSON.stringify(draw.ret_data.card));`);
  assert.equal(paid.status,0,paid.stderr);const card=JSON.parse(paid.stdout),earnedBytes=readFileSync(file),earned=JSON.parse(earnedBytes.toString());
  for(const [pvid,oldGame] of legacyState.gameStates) {
    const after=earned.gameStates.find(([id]:any)=>id===pvid)[1];
    if(pvid!==old.auth[0].pvid){assert.deepEqual(after,oldGame);continue;}
    assert.deepEqual(after.starter_cards,oldGame.starter_cards);assert.deepEqual(after.decks,oldGame.decks);
    assert.deepEqual(after.recruited_cards.slice(0,-1),oldGame.recruited_cards);assert.equal(after.recruited_cards.at(-1).inst_id,card.inst_id);
    assert.equal(after.gacha_free_qty,oldGame.gacha_free_qty-30);assert.equal(after.gacha_iap_qty,oldGame.gacha_iap_qty);
    assert.equal(after.gold,oldGame.gold);assert.equal(after.exp,oldGame.exp);
  }
  const returnLegacy=run(candidate,`import {ServerState} from '${source("state")}';new ServerState('http://localhost',${JSON.stringify(file)});`,
    {BLUSTONE_HUNTER_MIN_RANK_PROFILE:"legacy"});
  assert.equal(returnLegacy.status,0,returnLegacy.stderr);assert.deepEqual(readFileSync(file),earnedBytes,"Returning to legacy retains earned rank2 ownership exactly");
  const invalid=structuredClone(earned),owner=invalid.gameStates.find(([id]:any)=>id===old.auth[0].pvid)[1];owner.recruited_cards.at(-1).rank=1;
  const invalidFile=path.join(directory,"incompatible-material-rank1.json"),invalidBytes=Buffer.from(JSON.stringify(invalid));writeFileSync(invalidFile,invalidBytes);
  const refused=run(candidate,`import {ServerState} from '${source("state")}';new ServerState('http://localhost',${JSON.stringify(invalidFile)});`);
  assert.notEqual(refused.status,0);assert.match(refused.stderr,/minimum-rank projection lacks an owned rank\/awakening row/);assert.deepEqual(readFileSync(invalidFile),invalidBytes);
  const unknownMode=run(candidate,`import '${source("state")}';`,{BLUSTONE_HUNTER_MIN_RANK_PROFILE:"unknown"});
  assert.notEqual(unknownMode.status,0);assert.match(unknownMode.stderr,/Unknown Hunter minimum-rank profile/);assert.deepEqual(readFileSync(file),earnedBytes);
  assert.deepEqual(readFileSync(fullPath),fullBytes,"Existing full-progression profile was never edited");
}finally{rmSync(directory,{recursive:true,force:true});}
console.log("Compatible material birth grades: exact8 partial community policy, first-six reference/legacy three-owner preservation, real paid013rank2, no quick-ticket unlock, full-profile numeric parity, malformed/unknown/incompatible refusal and legacy return passed; no live/native balance claim.");
