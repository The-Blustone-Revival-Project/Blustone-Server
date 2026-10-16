import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {repositoryPath} from "../src/paths.js";

// Every material owner below is obtained by an actual paid handler. No prior
// material instances, trace stock, Manda top-up or forged clear history is seeded.
const dir=mkdtempSync(path.join(tmpdir(),"blustone-material-progression-")),file=path.join(dir,"state.json");
const savedEnv={...process.env},clock=Date.now;Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  for(const key of Object.keys(process.env))if(key.startsWith("BLUSTONE_"))delete process.env[key];
  const profileFile=repositoryPath("config/profiles/current-e6-materials-progression.json"),profileBytes=readFileSync(profileFile);
  const profile=JSON.parse(profileBytes.toString("utf8"));
  const previous=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials-skills.json"),"utf8"));
  const priorEnv={...profile.env};delete priorEnv.BLUSTONE_MATERIAL_STAT_PROFILE;delete priorEnv.BLUSTONE_HUNTER_MIN_RANK_PROFILE;
  assert.deepEqual(priorEnv,previous.env);assert.equal(profile.preparedOnly,true);
  assert.equal(profile.resourceStamp,previous.resourceStamp);assert.equal(profile.expectedPackages,139);
  Object.assign(process.env,profile.env);
  const {ServerState}=await import("../src/state.js"),{createApp}=await import("../src/server.js");
  const {starterReference,referenceRecruitRank}=await import("../src/bootstrap.js");
  const {skillUpPrice}=await import("../src/skill-training.js");
  const source=new ServerState("http://localhost",file),auth=source.registerGuest({device_id:"paid-material-owner"},{}).ret_data as any;
  const peer=source.registerGuest({device_id:"paid-material-peer"},{}).ret_data as any;
  const initial=JSON.parse(readFileSync(file,"utf8")),initialGame=initial.gameStates.find(([id]:any)=>id===auth.pvid)[1];
  let ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});server=createServer(ctx.app);
  await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No disposable loopback port");
  let base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
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
  const read=()=>JSON.parse(readFileSync(file,"utf8"));
  const own=()=>read().gameStates.find(([id]:any)=>id===auth.pvid)[1];
  const materials=[["009",1],["010",4],["012",3],["013",2],["017",1],["036",3],["040",3],["049",3]] as const;
  const acquired:number[]=[];let trainedGold=0;
  for(const [id,rank] of materials) {
    process.env.BLUSTONE_RECRUIT_CARD=id; // Existing explicit operator selection, no client-selected reward.
    const before=own(),draw=(await secure("/shop/GachaPremium",{cnt:"1",item_inst_id:"0"})).decoded;
    assert.equal(draw.result_code,1);assert.equal(draw.ret_data.cnt,1);assert.equal(Array.isArray(draw.ret_data.card),false);
    const card=draw.ret_data.card;assert.equal(card.ref_id,id);assert.equal(card.rank,rank);assert.equal(card.is_duplicate,0);
    assert.equal(referenceRecruitRank(id),rank);assert.equal(card.reward.ref_id,id);assert.equal(card.reward.qty,1);
    assert.equal(card.lock,1);acquired.push(card.inst_id);
    const after=own();assert.equal(after.recruited_cards.length,before.recruited_cards.length+1);
    assert.equal(after.gacha_free_qty,before.gacha_free_qty-30);assert.equal(after.gacha_iap_qty,before.gacha_iap_qty);
    assert.deepEqual(after.recruited_cards.at(-1).ref_id,id);
    assert.equal(Object.hasOwn(after.recruited_cards.at(-1),"reward"),false,"Popup metadata never pollutes persisted ordinary inventory");
    for(let slot=1;slot<=5;slot++)assert.equal(card[`skill_${slot}_level`],rank>=slot?1:0);
    const reference=starterReference.find(r=>r.base.id===id)!;assert.ok(reference.skill[0].effect.length>0);
    assert.equal(reference.stat[0].rank,rank);
    const upgraded=(await secure("/gym/SkillUp",{target_inst_id:String(card.inst_id),skill_idx:"1"})).decoded;
    assert.equal(upgraded.result_code,1);assert.deepEqual(upgraded.ret_data.target_inst.skill_1_level,{prev:1,cur:2});
    const gold=skillUpPrice(reference.base.role,2)!.gold;trainedGold+=gold;
    assert.deepEqual(upgraded.ret_data.user.gold,{prev:after.gold,cur:after.gold-gold});
    assert.equal((await secure("/world/SetDeck",{deck_info:JSON.stringify([{type:1,list:[card.inst_id,0,0,0,0]}])})).decoded.result_code,1);
    assert.equal((await secure("/card_handler/SetLeader",{target_inst_id:String(card.inst_id)})).decoded.result_code,1);
    const started=(await secure("/mission/Start",{stage_id:"n_01_01"})).decoded;assert.equal(started.result_code,1);
    assert.deepEqual(started.ret_data.battle.deck_inst_ids,[card.inst_id]);
    // A protocol-level reported win exercises settlement; no native fight or
    // autonomous combat outcome is claimed by this disposable host test.
    const ended=(await secure("/mission/Complete",{stage_id:"n_01_01",play_info:JSON.stringify({clear:1,clear_time:2,dead_cnt:0})})).decoded;
    assert.equal(ended.result_code,1);
    const progressed=own(),current=progressed.recruited_cards.find((c:any)=>c.inst_id===card.inst_id);
    assert.equal(current.skill_1_level,2);assert.ok(current.exp>0,"Paid material participant earns actual local mission EXP");
    for(const previousId of acquired.filter(value=>value!==card.inst_id))
      assert.equal(progressed.recruited_cards.find((c:any)=>c.inst_id===previousId).exp,
        after.recruited_cards.find((c:any)=>c.inst_id===previousId).exp,"Only snapshotted current participant gains EXP");
  }
  const final=read(),game=own();assert.equal(game.recruited_cards.length,initialGame.recruited_cards.length+8);
  assert.equal(new Set(acquired).size,8);assert.equal(game.gacha_free_qty,initialGame.gacha_free_qty-240);
  assert.equal(game.gacha_iap_qty,initialGame.gacha_iap_qty);assert.ok(trainedGold>0);
  for(const [id,rank] of materials)assert.ok(game.card_book.some((row:any)=>row.ref_id===id&&row.rank===rank));
  assert.deepEqual(final.gameStates.find(([id]:any)=>id===peer.pvid),initial.gameStates.find(([id]:any)=>id===peer.pvid));
  assert.deepEqual(game.starter_cards,initialGame.starter_cards,"No material acquisition rewrites the projected starter roster");
  assert.deepEqual(game.episode_progress,initialGame.episode_progress);
  const stable=readFileSync(file),restored=new ServerState(base,file);
  const reloaded=(restored as any).gameByPvid.get(auth.pvid);assert.deepEqual(reloaded.recruited_cards,game.recruited_cards);
  assert.deepEqual(readFileSync(file),stable);
  // Replace the HTTP app itself. The existing secure client now proves that
  // persisted transport/session keys and all eight earned owners rehydrate.
  await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});server=createServer(ctx.app);
  await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
  const restoredAddress=server.address();if(!restoredAddress||typeof restoredAddress==="string")throw new Error("No restored loopback port");
  base=`http://127.0.0.1:${restoredAddress.port}`;ctx.state.baseUrl=base;
  const inventory=(await secure("/world/RefreshInven",{card_inst_list:JSON.stringify(acquired)})).decoded;
  assert.equal(inventory.result_code,1);assert.deepEqual(inventory.ret_data.card,game.recruited_cards.filter((c:any)=>acquired.includes(c.inst_id)));
  assert.deepEqual(readFileSync(file),stable,"Absolute owned refresh and restart preserve complete save bytes");
  process.env.BLUSTONE_RECRUIT_CARD="999";
  const refused=(await secure("/shop/GachaPremium",{cnt:"1"})).decoded;
  assert.equal(refused.ret_data.cnt,0);assert.equal(refused.ret_data.card,null);assert.deepEqual(readFileSync(file),stable);
  assert.deepEqual(readFileSync(profileFile),profileBytes);
  // Invalid CLI choices fail before state creation or any child server spawn.
  for(const value of ["001","../013","13","--dev"]) {
    const invalidFile=path.join(dir,"invalid-"+value.replace(/[^a-z0-9]/gi,"_")+".json");
    const invalid=spawnSync(process.execPath,[repositoryPath("scripts/start-local.mjs"),"--profile",profile.name,
      "--state-file",invalidFile,"--recruit-card",value],{cwd:dir,env:savedEnv,encoding:"utf8",timeout:10_000});
    assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/three-digit non-main/);assert.equal(existsSync(invalidFile),false);
  }
} finally {
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];Object.assign(process.env,savedEnv);
  Date.now=clock;rmSync(dir,{recursive:true,force:true});
}
console.log("Paid material Hunter progression:8 real paid single recruits/community birth grades, exact240 Manda, native single DTO/book/ownership, all skill keys, SkillUp, leader/deck, snapshotted mission EXP, restart/absolute refresh, peer isolation and inactive-profile/CLI refusal passed; no seeded material owners/native combat or original pool claim.");
