import assert from "node:assert/strict";
import {parseExpeditionEntrustRequest,expeditionEntrustQuote} from "../src/expedition-entrust.js";

const request={stage_id:"n_01_07",deck_type:"2",cnt:"3",is_tuto:"0",otp:"AUTHORED",pvid:"1"};
assert.deepEqual(parseExpeditionEntrustRequest(request),{stage_id:"n_01_07",deck_type:2,cnt:3,is_tuto:0});
assert.deepEqual(expeditionEntrustQuote(3,2,null),{secondsPerRun:150,durationSeconds:450,fuel:6},"150 is original seconds, separate from supplied stage fuel");
assert.deepEqual(expeditionEntrustQuote(3,2,{mode:1,value:500}),{secondsPerRun:75,durationSeconds:225,fuel:6},"Authored benefit changes duration only");
assert.deepEqual(expeditionEntrustQuote(3,2,{mode:1,value:333}),{secondsPerRun:49,durationSeconds:147,fuel:6},"Truncate per-run duration before count multiplication; not149");
assert.deepEqual(expeditionEntrustQuote(1,2,{mode:1,value:0}),{secondsPerRun:0,durationSeconds:0,fuel:2},"Present zero differs from absent benefit");
assert.deepEqual(expeditionEntrustQuote(0,2,null),{secondsPerRun:150,durationSeconds:0,fuel:0},"Arithmetic preview does not grant zero-count eligibility");
assert.equal(Object.hasOwn(expeditionEntrustQuote(3,2,null),"gold"),false);
const decoded=parseExpeditionEntrustRequest(request);decoded.stage_id="changed";assert.equal(request.stage_id,"n_01_07");
for(const patch of [{cnt:"3.0"},{cnt:"03"},{cnt:-1},{cnt:0x1_0000_0000},{cnt:1.5},{deck_type:0x8000_0000},
  {stage_id:null},{stage_id:"bad\ud800"},{stage_id:""},{is_tuto:true},{is_tuto:2}])assert.throws(()=>parseExpeditionEntrustRequest({...request,...patch}));
assert.equal(parseExpeditionEntrustRequest({...request,deck_type:-1,is_tuto:1}).deck_type,-1,"General requester signed selector is not an authorization whitelist");
assert.throws(()=>parseExpeditionEntrustRequest(Object.create(request)));
let getter=false;const accessed={...request};Object.defineProperty(accessed,"cnt",{enumerable:true,get(){getter=true;return 3;}});
assert.throws(()=>parseExpeditionEntrustRequest(accessed));assert.equal(getter,false);
for(const args of [[-1,2,null],[1.5,2,null],[1,-1,null],[1,2,{mode:0,value:1}],[0xffff_ffff,2,null],[1,2,{mode:1,value:-1}],
  ["3",2,null],[1,NaN,null]] as const)assert.throws(()=>expeditionEntrustQuote(args[0] as number,args[1],args[2]));
console.log("Expedition Entrust: independent native request grammar, original150 seconds-per-run, TYPE4 multiplier placement, independent fuel, zero/absence distinction, strict domains/detachment/overflow refusal passed; no gold charge or dispatch settlement.");
