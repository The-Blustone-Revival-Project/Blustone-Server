import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {createApp} from "../src/server.js";
import {repositoryPath} from "../src/paths.js";
import {webviewEvidenceRoutes,webviewRouteDefinitions} from "../src/webview-routes.js";

process.env.BLUSTONE_PACKAGE_DIR=repositoryPath("resources/test-fixtures/base-packages");
process.env.BLUSTONE_PACKAGE_NAMES="E_NEW.jet";
const directory=mkdtempSync(path.join(tmpdir(),"blustone-webview-unavailable-")),file=path.join(directory,"state.json");
const context=createApp({baseUrl:"http://localhost",stateFile:file,profileMode:"disabled"});
const guest=context.state.registerGuest({device_id:"webview-refusal-owner"},{}).ret_data as any;
const auth={pvid:guest.pvid,otp:guest.otp};
const state=context.state as any;
const before={bytes:readFileSync(file),games:structuredClone([...state.gameByPvid]),accounts:structuredClone([...state.accountsByPvid]),summary:context.state.summary()};
const identities=[...state.gameByPvid.values(),...state.accountsByPvid.values()];
const unchanged=()=>{
  assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...state.gameByPvid],before.games);assert.deepEqual([...state.accountsByPvid],before.accounts);
  assert.deepEqual(context.state.summary(),before.summary);assert.deepEqual([...state.gameByPvid.values(),...state.accountsByPvid.values()],identities);
  for(const [index,value] of [...state.gameByPvid.values(),...state.accountsByPvid.values()].entries())assert.equal(value,identities[index]);
};
// Any accidental auth, lazy snapshot creation or persistence call must fail.
for(const method of ["accountFor","gameFor","persist"])state[method]=()=>{throw new Error("Unavailable WebView must not call "+method);};
const server=createServer(context.app);await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
const address=server.address();if(!address||typeof address==="string")throw new Error("Missing HTTP listener");
const base=`http://127.0.0.1:${address.port}`;
const expected={accepted:false,claimed:false,items:[]};
const check=(body:any,route:string,keys:string[])=>{
  assert.equal(body.result_code,2001);assert.equal(body.success,false);assert.deepEqual(body.ret_data,expected);assert.deepEqual(body.data,expected);
  assert.equal(body.replica,true);assert.equal(body.evidence_route,route);assert.match(body.message,/unavailable/);assert.deepEqual(body.request_keys,keys);
  assert.ok(!JSON.stringify(body).includes('"claimed":true'));assert.ok(!JSON.stringify(body).includes('"accepted":true'));
  for(const secret of ["SECRET_PAYLOAD","TOKEN_PAYLOAD","PASSWORD_PAYLOAD","COOKIE_PAYLOAD","OTP_PAYLOAD","VALUE_NEVER_REFLECTED"])
    assert.equal(JSON.stringify(body).includes(secret),false);
};
try {
  assert.equal(webviewEvidenceRoutes.length,9);
  for(const route of webviewEvidenceRoutes) {
    const cases=[{}, {event_id:"VALUE_NEVER_REFLECTED",reward_id:0},
      {...auth,event_id:"VALUE_NEVER_REFLECTED",access_token:"TOKEN_PAYLOAD",secret:"SECRET_PAYLOAD",password:"PASSWORD_PAYLOAD",cookie:"COOKIE_PAYLOAD",OTP:"OTP_PAYLOAD"},
      {event_id:{unexpected:[null,true]},qty:-1,claim:true}, [],["malformed","SECRET_PAYLOAD"]];
    for(const body of cases) {
      const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      assert.equal(response.status,200);check(await response.json(),route,Array.isArray(body)?[]:Object.keys(body).filter(key=>!/(token|secret|password|cookie|otp)/i.test(key)).sort());unchanged();
    }
    const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({event_id:"VALUE_NEVER_REFLECTED",vs_token:"TOKEN_PAYLOAD",otp:"OTP_PAYLOAD"})});
    assert.equal(response.status,200);check(await response.json(),route,["event_id"]);unchanged();
    // Exercise malformed decoded bodies directly; invalid JSON syntax is the
    // Express transport parser's independent400 boundary, not a route success.
    const definition=webviewRouteDefinitions(context.state).find(row=>row.path===route)!;
    for(const raw of [undefined,null,42,"SECRET_PAYLOAD"]) {
      let result:any;
      (definition.handler as any)({body:raw},{json:(value:any)=>{result=value;return value;}},()=>{throw new Error("Unexpected next()");});
      check(result,route,[]);assert.equal(result.ret_data,result.data,"One neutral receipt object backs both aliases");unchanged();
    }
  }
}finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));rmSync(directory,{recursive:true,force:true});}
console.log("Nine unavailable WebView operations: authenticated/anonymous/invalid bodies and form requests refuse without account lookup, allocation, persistence, grants or secret reflection; profile handlers untouched.");
