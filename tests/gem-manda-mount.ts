import assert from "node:assert/strict";
import {planPaidGemMount} from "../src/gem-paid-mount.js";
import {parseGemMountRequest,planFreeGemMount} from "../src/gem-mount.js";
import type {GemReference} from "../src/gem-instances.js";
import type {LocalCardInstance} from "../src/game.js";
const refs:GemReference[]=[{id:"AUTHORED",name:"Fixture",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1}];
const cards=[{inst_id:1000001,ref_id:"001",weapon_rank:3,armor_rank:1,accessory_rank:1},{inst_id:1000002,ref_id:"002",weapon_rank:3}] as LocalCardInstance[];
const gems=[{ref_id:"AUTHORED",inst_id:"9007199254740993",rank:1,level:1,position:1,target_inst_id:"1000001",ability:"opaque",abilities:null},
 {ref_id:"AUTHORED",inst_id:"18446744073709551615",rank:1,level:6,position:2,target_inst_id:"1000001",ability:"opaque2",abilities:null},
 {ref_id:"AUTHORED",inst_id:"3",rank:1,level:1,position:1,target_inst_id:"1000002",ability:"peer opaque",abilities:null}];
const prices=[{level:1,price_type:1,price:2},{level:6,price_type:1,price:15},{level:1,price_type:2,price:2500},{level:6,price_type:2,price:15000}];
const request=(cells:unknown[],payment:unknown="1")=>({target_inst_id:"1000001",price_type:payment,combination:{weapons:cells,armors:[0,0],accessories:[0,0]}});
const wallet={free_iap_qty:10,iap_qty:20},before=structuredClone({gems,cards,prices,wallet});
const run=(cells:unknown[],quotes=prices,w=wallet)=>planPaidGemMount(request(cells),cards,gems,refs,new Set(),quotes,100000,w);
const swapped=run([gems[1].inst_id,gems[0].inst_id]);assert.equal(swapped.fee,17);assert.equal(swapped.gold,100000);
assert.deepEqual(swapped.manda,{free_iap_qty:0,iap_qty:13});assert.equal(swapped.removedCells,2);assert.equal(swapped.changed,2);
assert.deepEqual(swapped.next?.[2],gems[2]);assert.equal(swapped.next?.[0].position,2);
const removed=run([0,0]);assert.equal(removed.fee,17);assert.deepEqual(removed.manda,swapped.manda);
const retry=planPaidGemMount(request([0,0]),cards,removed.next!,refs,new Set(),[],100000,removed.manda);
assert.equal(retry.fee,0);assert.equal(retry.changed,0);assert.deepEqual(retry.manda,removed.manda);assert.deepEqual(retry.receipt,removed.receipt);
const freeOnly=run([0,gems[1].inst_id],prices,{free_iap_qty:5,iap_qty:0});assert.deepEqual(freeOnly.manda,{free_iap_qty:3,iap_qty:0});
const split=run([0,gems[1].inst_id],prices,{free_iap_qty:1,iap_qty:3});assert.deepEqual(split.manda,{free_iap_qty:0,iap_qty:2});
const paidOnly=run([0,gems[1].inst_id],prices,{free_iap_qty:0,iap_qty:3});assert.deepEqual(paidOnly.manda,{free_iap_qty:0,iap_qty:1});
assert.match(run([0,0],prices,{free_iap_qty:1,iap_qty:15}).error!,/Insufficient/);
assert.match(run([0,0],prices.filter(p=>p.price_type===2)).error!,/missing/);
for(const w of [{free_iap_qty:-1,iap_qty:30},{free_iap_qty:0.5,iap_qty:30},{free_iap_qty:0x7fffffff,iap_qty:1},
 {free_iap_qty:0x80000000,iap_qty:0}])assert.match(run([0,0],prices,w).error!,/signed32/);
assert.match(run([0,0],[{level:1,price_type:1,price:0x7fffffff},{level:6,price_type:1,price:1}],{free_iap_qty:0x7fffffff,iap_qty:0}).error!,/signed32/);
const limit=run([0,gems[1].inst_id],[{level:1,price_type:1,price:0x7fffffff}],{free_iap_qty:0x7fffffff,iap_qty:0});
assert.equal(limit.fee,0x7fffffff);assert.deepEqual(limit.manda,{free_iap_qty:0,iap_qty:0});
for(const payment of [true,"01",0,3,4,1.5])assert.match(planPaidGemMount(request([0,0],payment),cards,gems,refs,new Set(),prices,100000,wallet).error!,/choices/);
assert.throws(()=>parseGemMountRequest(request([0,0])),/choices/);assert.equal(parseGemMountRequest(request([0,0]),true).payment,1);
assert.match(planFreeGemMount(request([0,0]),cards,gems,refs,new Set()).error!,/choices/);
const gold=planPaidGemMount(request([0,gems[1].inst_id],2),cards,gems,refs,new Set(),prices,100000,wallet);
assert.equal(gold.gold,97500);assert.equal(gold.manda,undefined);assert.equal(gold.fee,2500);
assert.deepEqual({gems,cards,prices,wallet},before);
console.log("Manda Gem removal: selected-currency quotes, local free-first debit, swaps/full64/peer preservation, signed32 bounds, missing/funds refusal and retry passed");
