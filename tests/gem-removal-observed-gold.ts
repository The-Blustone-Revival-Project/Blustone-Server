import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync,readFileSync} from "node:fs";
import {repositoryPath,repositoryRoot} from "../src/paths.js";
import path from "node:path";
import {gemRemovalPrices,gemRemovalPriceAt} from "../src/gem-removal-prices.js";
import {planPaidGemMount} from "../src/gem-paid-mount.js";
import type {GemReference} from "../src/gem-instances.js";
import type {LocalCardInstance} from "../src/game.js";

const root=repositoryRoot,load=(name:string)=>JSON.parse(readFileSync(repositoryPath("config","policies",name),"utf8"));
const input=load("gem-removal-observed-gold.json"),evidence=load("gem-removal-observed-gold.provenance.json");
const hash=(value:Buffer|string)=>createHash("sha256").update(value).digest("hex");
const prices=gemRemovalPrices({result_code:1,ret_data:input});
assert.deepEqual(prices,[{level:1,price_type:2,price:2500},{level:6,price_type:2,price:15000},
  {level:7,price_type:2,price:17500},{level:15,price_type:2,price:40000}]);
assert.equal(evidence.origin,"historical-manual-transcriptions");assert.equal(evidence.quotes.length,5);
assert.equal(hash(JSON.stringify(evidence.quotes)),"54fd2abdfc5d122dd172fa35a71eb5c05d07e3a68b5d2752e4d4678c59ec581e");
const ddl=path.resolve(root,"../Blustone-DataDump");
for(const quote of evidence.quotes) {
  assert.equal(hash(quote.raw_tsv_row),quote.raw_row_sha256);
  const fields=quote.raw_tsv_row.split("\t");assert.equal(Number(fields[0]),quote.index);assert.equal(fields[1],quote.image_filename);
  assert.equal(Number(fields[2]),quote.image_width);assert.equal(Number(fields[3]),quote.image_height);
  assert.equal(quote.screenshot_sha256,null,"no unavailable screenshot byte hash may be invented");
  assert.ok(fields[10].includes(String(quote.price)));
  assert.equal(gemRemovalPriceAt(prices,quote.level,2)?.price,quote.price);
  const source=path.resolve(ddl,quote.path);assert.ok(source.startsWith(ddl+path.sep));
  if(existsSync(source)) {
    const bytes=readFileSync(source);assert.equal(hash(bytes),quote.source_sha256);
    assert.equal(bytes.toString("utf8").split(/\r?\n/)[quote.line-1],quote.raw_tsv_row);
  }
}
for(const level of [0,2,3,4,5,8,9,10,11,12,13,14,16])assert.equal(gemRemovalPriceAt(prices,level,2),undefined);
for(const row of prices)for(const payment of [0,1,4,9])assert.equal(gemRemovalPriceAt(prices,row.level,payment),undefined);
assert.notEqual(gemRemovalPriceAt(prices,15,2)?.price,15*2500,"do not extrapolate a linear curve");
assert.throws(()=>gemRemovalPrices({result_code:1,ret_data:[...prices,{...prices[0],price:1}]}),/Duplicate/);

// Identities, ownership and rolls below are authored fixtures. Only the sparse
// fee amounts come from the transcriptions; publication grants no Gem.
const refs:GemReference[]=[{id:"LOCAL_TEST_GEM",name:"Authored fixture",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1}];
const cards=[{inst_id:1000001,ref_id:"001",weapon_rank:3,armor_rank:1,accessory_rank:1},
  {inst_id:1000002,ref_id:"002",weapon_rank:3,armor_rank:1,accessory_rank:1}] as LocalCardInstance[];
const gem=(id:string,level:number,position=1,target="1000001")=>({ref_id:"LOCAL_TEST_GEM",inst_id:id,rank:1,level,position,
  target_inst_id:target,ability:"authored opaque unchanged",abilities:null});
const request=(weapons:unknown[],payment=2)=>({target_inst_id:"1000001",price_type:payment,
  combination:{weapons,armors:[0,0],accessories:[0,0]}});
for(const row of prices) {
  const gems=[gem("9007199254740993",row.level),gem("2",1,1,"1000002")],before=structuredClone({gems,cards,input});
  const result=planPaidGemMount(request([0,0]),cards,gems,refs,new Set(),prices,100000);
  assert.equal(result.error,undefined);assert.equal(result.fee,row.price);assert.equal(result.gold,100000-row.price);
  assert.equal(result.removedCells,1);assert.equal(result.changed,1);assert.equal(result.receipt?.length,2);
  assert.deepEqual(result.next?.[0],{...gems[0],target_inst_id:"0",position:0});assert.deepEqual(result.next?.[1],gems[1]);
  const retry=planPaidGemMount(request([0,0]),cards,result.next!,refs,new Set(),[],result.gold!);
  assert.equal(retry.fee,0);assert.equal(retry.changed,0);assert.deepEqual(retry.receipt,result.receipt);
  assert.match(planPaidGemMount(request([0,0]),cards,gems,refs,new Set(),prices,row.price-1).error!,/Insufficient/);
  assert.match(planPaidGemMount(request([0,0],1),cards,gems,refs,new Set(),prices,100000).error!,/Manda/);
  assert.deepEqual({gems,cards,input},before,"successful and refused planning must preserve source rows");
}
const uncovered=[gem("1",8)];assert.match(planPaidGemMount(request([0,0]),cards,uncovered,refs,new Set(),prices,100000).error!,/missing/);
const mixed=[gem("1",1),gem("2",8,2)],mixedBefore=structuredClone(mixed);
const refused=planPaidGemMount(request([0,0]),cards,mixed,refs,new Set(),prices,100000);
assert.match(refused.error!,/missing/);assert.equal(refused.next,undefined);assert.equal(refused.gold,undefined);assert.deepEqual(mixed,mixedBefore);
const two=[gem("1",6),gem("2",7,2)],swapped=planPaidGemMount(request(["2","1"]),cards,two,refs,new Set(),prices,100000);
assert.equal(swapped.fee,32500);assert.equal(swapped.gold,67500);assert.equal(swapped.removedCells,2);
assert.equal(swapped.next?.[0].position,2);assert.equal(swapped.next?.[1].position,1);
assert.match(planPaidGemMount(request([0,0]),cards,two,refs,new Set([1000001]),prices,100000).error!,/combat/);
const noop=planPaidGemMount(request(["1","2"]),cards,two,refs,new Set(),[],100000);assert.equal(noop.fee,0);
assert.deepEqual(input,prices,"parsing must not alter supplied wire rows");
console.log("Sparse observed Gem removal: five pinned transcriptions, four exact gold2 levels, no interpolation/payment1, funded per-cell removal/retry/atomic refusal PASS");
