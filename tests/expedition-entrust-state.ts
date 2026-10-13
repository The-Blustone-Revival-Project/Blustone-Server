import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {createServer} from "node:http";
import {createApp} from "../src/server.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-entrust-refusal-"));
const file=path.join(dir,"state.json"),context=createApp({baseUrl:"http://127.0.0.1",stateFile:file}),server=createServer(context.app);
try {
  const guest=context.state.registerGuest({device_id:"entrust-guard-fixture"},{}).ret_data as any;
  const auth={pvid:String(guest.pvid),otp:String(guest.otp)};
  const bytes=readFileSync(file);
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No loopback port");
  const post=async(body:unknown,route="Entrust")=>{const reply=await fetch(`http://127.0.0.1:${address.port}/mission/${route}`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});assert.equal(reply.status,200);return reply.json();};
  const request={stage_id:"n_01_07",deck_type:"2",cnt:"3",is_tuto:"0"};
  const unauthenticated=await post(request);assert.equal(unauthenticated.result_code,2001);
  const response=await post({...auth,...request});assert.equal(response.result_code,2001);
  assert.equal(response.ret_data.mock,undefined,"Incomplete timed jobs must not be advertised as successful mocks");
  assert.equal(response.ret_data.entrust_id,undefined,"No fabricated job identity");
  assert.equal((await post({...auth,...request,gold:"0",complete_second:"0",entrust_id:"spoof"})).result_code,2001);
  for(const route of ["RefreshEntrust","EndEntrust","EntrustByIAP"]){
    assert.equal((await post({entrust_id:"1"},route)).result_code,2001);
    const refusal=await post({...auth,...request,entrust_id:"1"},route);
    assert.equal(refusal.result_code,2001);assert.equal(refusal.ret_data.mock,undefined);
  }
  for(const body of [{entrust_id:"1"},{...auth,entrust_id:"1"},{...auth,otp:"wrong",entrust_id:"1"},
    {...auth,entrust_id:"1",iap_qty:"0",free_iap_qty:"0",complete_second:"0"}]) {
    const skipped=await post(body,"SkipEntrust");assert.equal(skipped.result_code,2001);
    assert.equal(skipped.ret_data,null,"Skip's null data branch bypasses unguarded native wallet/job mutation");assert.equal(skipped.data,null);
  }
  const raw=await fetch(`http://127.0.0.1:${address.port}/mission/SkipEntrust`,{method:"POST",
    headers:{"content-type":"application/octet-stream","pv-accesstoken":"AUTHORED_UNKNOWN"},body:new Uint8Array([1,2,3])});
  assert.equal(raw.status,200);const rawFailure=await raw.json();assert.equal(rawFailure.result_code,2001);assert.equal(rawFailure.ret_data,null,"Failed secure decoding also reaches the null refusal");
  assert.deepEqual(readFileSync(file),bytes,"Refused real HTTP dispatch preserves every account/game field, AP clocks, wallet, decks and rewards");
}finally{
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  rmSync(dir,{recursive:true,force:true});
}
console.log("Expedition Entrust route: real HTTP authentication, explicit result2001 before native timed-job parse, no fabricated dispatch/mock or saved-state changes passed; timed settlement remains pending.");
