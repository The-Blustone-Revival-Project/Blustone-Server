import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repositoryPath} from "../src/paths.js";

// Load an inactive reference profile only in this disposable process. No live
// port/profile/save is used, and original saved ownership comes from an older
// neutral-skill process rather than the new profile under test.
const dir=mkdtempSync(path.join(tmpdir(),"blustone-material-skills-http-")),file=path.join(dir,"state.json");
const realNow=Date.now,savedEnv={...process.env};Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  for(const key of Object.keys(process.env))if(key.startsWith("BLUSTONE_"))delete process.env[key];
  const profilePath=repositoryPath("config/profiles/current-e6-materials-skills.json"),profileBytes=readFileSync(profilePath);
  const candidate=JSON.parse(profileBytes.toString("utf8"));
  const baseline=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8"));
  const compiled=import.meta.url.endsWith(".js"),moduleRoot=compiled?"dist/":"",extension=compiled?"js":"ts";
  const seeded=spawnSync(process.execPath,[...(compiled?[]:["--import","tsx"]),"--input-type=module","--eval",`
    import {ServerState} from './${moduleRoot}src/state.${extension}';
    import {starterReference,cardInstance} from './${moduleRoot}src/bootstrap.${extension}';
    Date.now=()=>1800000000000;
    const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const auth=state.registerGuest({device_id:'material-skill-existing-owner'},{}).ret_data;
    state.registerGuest({device_id:'material-skill-peer'},{});
    const game=state.gameFor(state.accountFor(auth,{}));
    game.gold=13579;game.starter_cards[0].exp=610;game.starter_cards[0].skill_1_level=7;
    // Authored disposable prior ownership exercises every new reference; this
    // is not an acquisition/grant route or a claim about the live roster.
    const materials=['009','010','012','013','017','036','040','049'];
    game.recruited_cards.push(...materials.map((id,i)=>cardInstance(1000101+i,id,4)));
    game.next_card_inst_id=1000109;
    game.card_book=[...game.card_book.filter(row=>!materials.includes(row.ref_id)),...materials.map(ref_id=>({ref_id,rank:4}))];
    state.persist();
    console.log(JSON.stringify({auth,refs:starterReference}));`],
    {cwd:repositoryPath(),env:{...process.env,...baseline.env,BLUSTONE_MATERIAL_SKILL_PROFILE:"neutral"},encoding:"utf8",timeout:30_000});
  assert.equal(seeded.status,0,seeded.stderr);
  const prior=JSON.parse(seeded.stdout),auth=prior.auth,priorGames=JSON.parse(readFileSync(file,"utf8")).gameStates;
  Object.assign(process.env,candidate.env);
  const {createApp}=await import("../src/server.js");
  const {MATERIAL_SKILL_DONORS}=await import("../src/material-skill-projection.js");
  const ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});server=createServer(ctx.app);
  await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No disposable loopback port");
  const base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
  assert.equal(exchange.status,200);
  const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
  const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,
    publicKey:crypto.createPublicKey({key:pub,format:"der",type:"spki"})})).digest();
  const sign=(data:Buffer)=>crypto.createHmac("sha384",key).update(data).digest("base64");
  assert.equal(exchange.headers.get("pv-signature"),sign(pub));
  const secure=async(route:string,values:Record<string,string>)=>{
    const plaintext=Buffer.from(String(new URLSearchParams({...values,otp:String(auth.otp),pvid:String(auth.pvid)})));
    const cipher=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream",
      "pv-accesstoken":token,"pv-signature":sign(plaintext)},body:new Uint8Array(Buffer.concat([cipher.update(plaintext),cipher.final()]))});
    assert.equal(response.status,200);
    const encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream")===true;
    let text:string;
    if(encrypted){
      const decipher=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
      const bytes=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
      assert.equal(response.headers.get("pv-signature"),sign(bytes));text=bytes.toString("utf8");
    }else text=await response.text();
    const decoded=JSON.parse(text);if(decoded.result_code===1)assert.equal(encrypted,true,"Successful replies require native encrypted transport");
    return {decoded,text};
  };
  assert.equal((await secure("/lobby/Enter",{})).decoded.result_code,1);
  // Auth/session setup is complete before measuring the read-only operation.
  const before=readFileSync(file);
  const reference=(await secure("/reference/GetCard",{})).decoded;assert.equal(reference.result_code,1);
  const refs=reference.ret_data;assert.equal(refs.length,14);
  const sourcePath=repositoryPath("resources/reference/episodes/EPISODE_STAT_ACTORS.json"),sourceBytes=readFileSync(sourcePath);
  const original=JSON.parse(sourceBytes.toString("utf8"));
  const donorIds=new Set(MATERIAL_SKILL_DONORS.map(d=>d.refId));
  for(const row of refs) {
    const old=prior.refs.find((r:any)=>r.base.id===row.base.id);
    if(!donorIds.has(row.base.id)){assert.deepEqual(row,old);continue;}
    assert.deepEqual({...row,skill:old.skill},old,"Only these exact eight skill vectors change");
    const selected=MATERIAL_SKILL_DONORS.find(d=>d.refId===row.base.id)!;
    for(const slot of row.skill) {
      assert.equal(slot.icon_id,`C${row.base.id}_SI${slot.type}`,"Encrypted reference retains the LOCAL exact AT binding");
      assert.equal(slot.name,old.skill[slot.type-1].name);assert.equal(slot.cut_in_id,old.skill[slot.type-1].cut_in_id);
      const native=original[selected.sourceIndex].skill.find((s:any)=>s.type===slot.type);
      if(!native){assert.deepEqual(slot.effect,[]);continue;}
      assert.equal(slot.target_rank,native.target_rank);assert.equal(slot.cost,native.cost??0);
      assert.deepEqual(slot.effect,native.effect.map((effect:any,i:number)=>({...effect,
        serial:row.base.id==="049"&&slot.type===1?0:i+1,
        up_number:0,duration_up:0,value_calc:"",effect_desc:[]})));
    }
  }
  const owned=priorGames.find(([pvid]:any)=>pvid===auth.pvid)[1];
  assert.deepEqual(owned.recruited_cards.map((card:any)=>card.ref_id),["009","010","012","013","017","036","040","049"]);
  const ids=[...owned.starter_cards,...owned.recruited_cards].map((card:any)=>card.inst_id);
  const inventory=(await secure("/world/RefreshInven",{card_inst_list:JSON.stringify(ids)})).decoded;
  assert.equal(inventory.result_code,1);
  assert.deepEqual(inventory.ret_data.card,[...owned.starter_cards,...owned.recruited_cards],"Earned levels, all skill keys including0, rank/HP/decks preserved; no added Hunter");
  assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates,priorGames);
  assert.deepEqual(readFileSync(file),before,"Reference and targeted inventory reads leave the complete account/transport/save bytes unchanged");
  const {ServerState}=await import("../src/state.js");new ServerState(base,file);
  assert.deepEqual(readFileSync(file),before);assert.deepEqual(readFileSync(sourcePath),sourceBytes);assert.deepEqual(readFileSync(profilePath),profileBytes);
} finally {
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];
  Object.assign(process.env,savedEnv);Date.now=realNow;rmSync(dir,{recursive:true,force:true});
}
console.log("Material skill encrypted HTTP: inactive139 profile/14 refs, eight exact source graphs with prior six/stat metadata unchanged, progressed neutral-save restoration, all owned skill keys/no grants, complete read-byte preservation and restart passed; native skill execution unverified.");
