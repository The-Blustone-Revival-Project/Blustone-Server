import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-prices-"));
try {
  const file=path.join(dir,"state.json"),prices=[{action:1,price_type:2,price:17},{action:2,price_type:1,price:23},{action:3,price_type:1,price:31}];
  const options={guildPrices:structuredClone(prices)},state=new ServerState("http://localhost",file,options);
  const auth=state.registerGuest({device_id:"guild-prices"},{}).ret_data as any,before=readFileSync(file);
  const read=()=>gameResponse(state,"/reference/GetGuildPrices",auth) as any;
  assert.throws(()=>gameResponse(state,"/reference/GetGuildPrices",{}),/authenticated/);
  options.guildPrices[0].price=999;read().ret_data[1].price=888;assert.deepEqual(read().ret_data,prices);
  for(const route of ["/guild/Found","/guild/Update"])
    assert.equal((gameResponse(state,route,auth) as any).result_code,2001,"supplied quote does not recover ownership/debit/receipt admission");
  assert.deepEqual(readFileSync(file),before);
  const restart=new ServerState("http://localhost",file,{guildPrices:prices});
  assert.deepEqual((gameResponse(restart,"/reference/GetGuildPrices",auth) as any).ret_data,prices);assert.deepEqual(readFileSync(file),before);
  assert.throws(()=>new ServerState("http://localhost",file,{guildPrices:[prices[0],prices[0]]}),/duplicate/i);
  assert.deepEqual(readFileSync(file),before);
  const baseline=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(baseline,"/reference/GetGuildPrices",auth) as any).ret_data,[]);assert.deepEqual(readFileSync(file),before);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild action reference state: exact authenticated native rows, immutable startup snapshot, missing/duplicate refusal, unsupported mutation gate and byte-preserving restart passed; original numeric fees absent.");
