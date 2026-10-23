import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repositoryPath} from "../src/paths.js";

// Load an inactive reference profile only in this disposable process. No live
// port/profile/save is used. Saved ownership comes from the existing fourteen-donor
// mode; the nine added references were neutral in that separate process.
const dir=mkdtempSync(path.join(tmpdir(),"blustone-later-skills-http-")),file=path.join(dir,"state.json"),drawFile=path.join(dir,"baseline-draw.json");
const realNow=Date.now,savedEnv={...process.env};Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  for(const key of Object.keys(process.env))if(key.startsWith("BLUSTONE_"))delete process.env[key];
  const profilePath=repositoryPath("config/profiles/current-later-episodes.json"),profileBytes=readFileSync(profilePath);
  const baseline=JSON.parse(profileBytes.toString("utf8"));
  assert.equal(baseline.expectedPackages,280);assert.equal(baseline.env.BLUSTONE_MATERIAL_SKILL_PROFILE,"episode-indexed-expanded-projection");
  const candidate={...baseline,env:{...baseline.env,BLUSTONE_MATERIAL_SKILL_PROFILE:"episode-indexed-later-projection"}};
  const compiled=import.meta.url.endsWith(".js"),moduleRoot=compiled?"dist/":"",extension=compiled?"js":"ts";
  const seeded=spawnSync(process.execPath,[...(compiled?[]:["--import","tsx"]),"--input-type=module","--eval",`
    import assert from 'node:assert/strict';
    import {copyFileSync,readFileSync} from 'node:fs';
    import {ServerState} from './${moduleRoot}src/state.${extension}';
    import {starterReference} from './${moduleRoot}src/bootstrap.${extension}';
    Date.now=()=>1800000000000;
    const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const auth=[0,1,2].map(i=>state.registerGuest({device_id:'material-expanded-'+i},{}).ret_data);
    process.env.BLUSTONE_RECRUIT_CARD='049';
    const paidBright=state.gachaPremium({...auth[0],cnt:1,item_inst_id:0},{});
    assert.equal(paidBright.result_code,1);assert.equal(paidBright.ret_data.card.rank,3);assert.equal(paidBright.ret_data.card.ref_id,'049');
    const game=state.gameFor(state.accountFor(auth[0],{}));
    game.gold=13579;game.starter_cards[0].exp=610;game.starter_cards[0].skill_1_level=7;
    const mowgli=game.starter_cards.find(c=>c.ref_id==='002');assert.equal(mowgli.rank,1);mowgli.exp=520;
    game.decks[0].list=[mowgli.inst_id,game.starter_cards[0].inst_id,paidBright.ret_data.card.inst_id,0,0];
    game.stage_stars.n_01_01=3;
    for(let i=1;i<auth.length;i++){
      const peer=state.gameFor(state.accountFor(auth[i],{}));peer.gold=24680+i;peer.starter_cards[0].exp=120*i;
      peer.gacha_iap_qty=21+i;peer.gacha_free_qty=31+i;peer.stage_stars['n_01_0'+(i+1)]=i;
    }
    state.persist();
    copyFileSync(${JSON.stringify(file)},${JSON.stringify(drawFile)});
    const drawState=new ServerState('http://localhost',${JSON.stringify(drawFile)});
    process.env.BLUSTONE_RECRUIT_CARD='008';
    const paid=drawState.gachaPremium({...auth[0],cnt:1,item_inst_id:0},{});
    assert.equal(paid.result_code,1);assert.equal(paid.ret_data.card.ref_id,'008');assert.equal(paid.ret_data.card.rank,1);
    console.log(JSON.stringify({auth,refs:starterReference,paid,postDraw:JSON.parse(readFileSync(${JSON.stringify(drawFile)},'utf8')).gameStates}));`],
    {cwd:repositoryPath(),env:{...process.env,...baseline.env},encoding:"utf8",timeout:30_000,maxBuffer:4*1024*1024});
  assert.equal(seeded.status,0,seeded.stderr);
  const prior=JSON.parse(seeded.stdout),auth=prior.auth[0],originalBytes=readFileSync(file),priorGames=JSON.parse(originalBytes.toString("utf8")).gameStates;
  Object.assign(process.env,candidate.env);
  const {createApp}=await import("../src/server.js");
  const {LATER_MATERIAL_SKILL_DONORS}=await import("../src/later-material-skills.js");
  const ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});server=createServer(ctx.app);
  assert.deepEqual(readFileSync(file),originalBytes,"Expanded reference mode restores all three older earned games without rewriting bytes");
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
  const refs=reference.ret_data;assert.equal(prior.refs.length,40);assert.equal(refs.length,40);
  const sourcePath=repositoryPath("resources/reference/episodes/EPISODE_STAT_ACTORS.json"),sourceBytes=readFileSync(sourcePath);
  const original=JSON.parse(sourceBytes.toString("utf8"));
  const donorIds=new Set<string>(LATER_MATERIAL_SKILL_DONORS.map(d=>d.refId));
  assert.deepEqual([...donorIds],["008","019","023","028","043","046","057","064","068"]);
  assert.equal(refs.filter((row:any)=>!donorIds.has(row.base.id)).length,31);
  for(const row of refs) {
    const old=prior.refs.find((r:any)=>r.base.id===row.base.id);
    if(!donorIds.has(row.base.id)){assert.deepEqual(row,old);continue;}
    assert.deepEqual({...row,skill:old.skill},old,"Only these nine skill vectors change; stats, role, rank and presentation metadata remain exact");
    const selected=LATER_MATERIAL_SKILL_DONORS.find(d=>d.refId===row.base.id)!;
    assert.equal(original[selected.sourceIndex].id,selected.actorId);
    assert.equal(row.base.role,selected.role);assert.equal(row.base.attr,selected.attr);
    for(const slot of row.skill) {
      assert.equal(slot.icon_id,`C${row.base.id}_SI${slot.type}`,"Encrypted reference retains the LOCAL exact AT binding");
      assert.equal(slot.name,old.skill[slot.type-1].name);assert.equal(slot.desc,old.skill[slot.type-1].desc);assert.equal(slot.cut_in_id,old.skill[slot.type-1].cut_in_id);
      const native=original[selected.sourceIndex].skill.find((s:any)=>s.type===slot.type);
      if(!native){assert.deepEqual(slot.effect,[]);continue;}
      assert.equal(slot.target_rank,native.target_rank);assert.equal(slot.cost,native.cost??0);
      assert.equal(slot.cool_time,native.cool_time??0);assert.equal(slot.crt_chance,native.crt_chance??0);
      assert.deepEqual(slot.effect,native.effect.map((effect:any,i:number)=>({...effect,
        serial:i+1,
        up_number:0,duration_up:0,value_calc:"",effect_desc:[]})));
    }
  }
  for(const row of refs.filter((row:any)=>donorIds.has(row.base.id)))assert.deepEqual(row.skill[2].effect,[],"No donor contains type3; symbolic text cannot fabricate it");
  for(const id of ["008","019","023","028","043","064"])assert.deepEqual(refs.find((row:any)=>row.base.id===id).skill[4].effect,[]);
  assert.ok(refs.find((row:any)=>row.base.id==="020").skill.every((slot:any)=>slot.effect.length===0),"Sienna remains neutral because original cost disagrees");
  assert.deepEqual(refs.find((row:any)=>row.base.id==="046").skill[4].effect.map((effect:any)=>[effect.effect_type,effect.target_stat]),[[2,17],[6,14]],"Retain raw nesting inputs for one native conversion");
  assert.ok(refs.find((row:any)=>row.base.id==="068").skill.flatMap((slot:any)=>slot.effect)
    .some((effect:any)=>effect.target_stat===22&&effect.refer_target_stat===10));
  for(const id of ["035","071"])assert.deepEqual(refs.find((row:any)=>row.base.id===id),prior.refs.find((row:any)=>row.base.id===id),"No graph or role-conflicting identity stays neutral");
  const owned=priorGames.find(([pvid]:any)=>pvid===auth.pvid)[1];
  assert.deepEqual(owned.recruited_cards.map((card:any)=>card.ref_id),["049"]);
  const ids=[...owned.starter_cards,...owned.recruited_cards].map((card:any)=>card.inst_id);
  const inventory=(await secure("/world/RefreshInven",{card_inst_list:JSON.stringify(ids)})).decoded;
  assert.equal(inventory.result_code,1);
  assert.deepEqual(inventory.ret_data.card,[...owned.starter_cards,...owned.recruited_cards],"Earned levels, all skill keys including0, rank/HP/decks preserved; no added Hunter");
  assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates,priorGames);
  assert.deepEqual(readFileSync(file),before,"Reference and targeted inventory reads leave the complete account/transport/save bytes unchanged");
  const {ServerState}=await import("../src/state.js");new ServerState(base,file);
  assert.deepEqual(readFileSync(file),before);assert.deepEqual(readFileSync(sourcePath),sourceBytes);assert.deepEqual(readFileSync(profilePath),profileBytes);
  // A separate actual paid request compares the legacy and expanded modes on
  // equivalent disposable saves. Neither mode claims historical ordinary birth
  // ranks for these newly visible identities; existing selective policy stays1.
  process.env.BLUSTONE_RECRUIT_CARD="008";
  const paid=(await secure("/shop/GachaPremium",{cnt:"1",item_inst_id:"0"})).decoded;
  assert.deepEqual(paid,prior.paid,"Paid recruitment response shape, rank, ID and fee remain exact across skill-only modes");
  assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates,prior.postDraw,"Only the explicit matching paid draw changes owned state");
  assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates.slice(1),priorGames.slice(1),"Other two earned games stay exact after the paid draw");
  new ServerState(base,file);assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates,prior.postDraw);
} finally {
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];
  Object.assign(process.env,savedEnv);Date.now=realNow;rmSync(dir,{recursive:true,force:true});
}
console.log("Later material skills encryptedHTTP:40 refs/onlyninegraphs changed/all31others exact, rawtimers/nested/Rage selectors preserved, no type3 or absent5 invention,035/071 excluded, three earned games/paidBright3/Mowgli1 exact, identical paid008fee/rank/receipt and coldrestart passed; native execution pending.");
