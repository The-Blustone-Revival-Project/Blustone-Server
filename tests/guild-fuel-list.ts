import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-fuel-list-"));
try {
  const file=path.join(dir,"state.json"),state=new ServerState("http://localhost",file);
  const owner=state.registerGuest({device_id:"guild-fuel-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"guild-fuel-peer"},{}).ret_data as any;
  state.gameFor(state.accountFor(owner,{}));state.gameFor(state.accountFor(peer,{}));
  const bytes=readFileSync(file);
  const read=(current:ServerState,actor=owner)=>gameResponse(current,"/guild/GetFuelRequests",actor) as any;
  assert.throws(()=>read(state,{}),/authenticated/);
  assert.throws(()=>read(state,{otp:owner.otp,pvid:peer.pvid}),/account|pvid|identity/i);
  assert.equal(read(state).result_code,1);
  assert.deepEqual(read(state).ret_data,{fuel_requests:[]},"Actual callback needs named array, not a bare array or map");
  read(state).ret_data.fuel_requests.push({id:1,pvid:owner.pvid});
  assert.deepEqual(read(state,peer).ret_data,{fuel_requests:[]});
  assert.deepEqual(read(state).ret_data,{fuel_requests:[]});
  assert.equal((gameResponse(state,"/guild/SupportFuel",{...owner,request_id:1,ap:99}) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),bytes);
  const restart=new ServerState("http://localhost",file);
  assert.deepEqual(read(restart).ret_data,{fuel_requests:[]});
  assert.deepEqual(readFileSync(file),bytes);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild fuel list: authenticated named empty array, detached reads, no request/AP/support fabrication and complete save-preserving restart passed; native cache upsert is not a clear.");
