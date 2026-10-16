import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {repositoryPath} from "../src/paths.js";

const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6.json"),"utf8"));
function inspect(historical:boolean){
  const env={...process.env,...profile.env,BLUSTONE_CARD_REFERENCE_PROFILE:"materials"};
  delete env.BLUSTONE_TRACE_THRESHOLD_PROFILE;
  if(historical)env.BLUSTONE_TRACE_THRESHOLD_PROFILE="archive-images-2017-2018";
  const child=spawnSync(process.execPath,["--import","tsx","--input-type=module","--eval",`
    import {starterReference,starterInventory,recruitBirthRanks} from './src/bootstrap.ts';
    import {itemReference,HUNTER_TRACE_ITEMS,libraryNavigationTraceItems} from './src/hunter-traces.ts';
    import {historicalTraceQuantity,traceThresholdEvidence} from './src/trace-threshold-evidence.ts';
    const evidence=traceThresholdEvidence();evidence.requirements[0].collect_qty=999;
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,birth:recruitBirthRanks,
      items:itemReference(),exchange:HUNTER_TRACE_ITEMS,navigation:libraryNavigationTraceItems(),
      evidence:traceThresholdEvidence(),detached:historicalTraceQuantity('002'),
      unresolved:['001','010','049','999'].map(id=>historicalTraceQuantity(id)??null)}));
  `],{cwd:repositoryPath(),env,encoding:"utf8",timeout:30_000});
  assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
}
const local=inspect(false),historical=inspect(true);
const expected:Record<string,number>={"002":40,"003":80,"004":20,"005":40,"006":20,"009":20,"012":80,"013":40,"017":20,"036":80,"040":80};
assert.equal(historical.detached,40,"Audit callers cannot mutate the retained evidence");
assert.deepEqual(historical.unresolved,[null,null,null,null],"Conflicting/single-observation/unknown identities stay unresolved");
assert.deepEqual(Object.fromEntries(historical.evidence.requirements.map((row:any)=>[row.ref_id,row.collect_qty])),expected);
assert.deepEqual(historical.evidence.excluded.map((row:any)=>row.ref_id),["001","010","049"]);
assert.equal(historical.navigation.length,12);
for(const card of historical.refs){
  const bindings=historical.items.item.filter((row:any)=>row.use_type===3&&row.effect===card.base.id);
  assert.equal(bindings.length,1,"Exactly one native item effect binding per published Hunter");
  assert.equal(bindings[0].collect_qty,expected[card.base.id]??1);
}
for(const row of historical.evidence.requirements){
  const card=historical.refs.find((card:any)=>card.base.id===row.ref_id);
  assert.equal(card.base.name,row.hunter,"Bind observations to actual published identities, never a recalled numeric order");
  assert.ok(row.observations.length>=2);
  for(const id of row.observations){
    const observation=historical.evidence.observations.find((o:any)=>o.id===id);
    assert.ok(observation);assert.match(historical.evidence.sources[observation.source].sha256,/^[a-f0-9]{64}$/);
    assert.equal(Number(observation.raw_tsv.split("\t")[0]),observation.idx);
  }
}
assert.deepEqual(historical.refs,local.refs,"Reference stats, skills and roster coverage do not change");
assert.deepEqual(historical.inventory,local.inventory,"Historical display requirements grant nothing");
assert.deepEqual(historical.birth,local.birth,"No extra Hunter becomes recruitable");
assert.deepEqual(historical.items.trace,local.items.trace,"No new acquisition sources or stage bindings");
assert.deepEqual(historical.items.global_item,local.items.global_item,"No new shop offers");
assert.deepEqual(historical.exchange.map((row:any)=>row.cardId),["005","006"],"Library-only bindings are not added to the exchange whitelist");
assert.deepEqual(historical.items.item.map((row:any)=>row.id),local.items.item.map((row:any)=>row.id));
for(const row of historical.navigation){
  const prior=local.navigation.find((item:any)=>item.id===row.id);
  assert.deepEqual({...row,collect_qty:prior.collect_qty},prior,"Only the selected historical denominator changes");
}
console.log("Historical library requirements: 11 exact named identities, 3 explicit holds, pinned detached observations, unchanged stats/ownership/exchange whitelist/acquisition/shop and local fallback passed.");
