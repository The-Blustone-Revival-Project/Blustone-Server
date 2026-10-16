import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
import {parseGemInstances,projectGemStats} from "../src/gem-instances.js";
const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8"));Object.assign(process.env,profile.env);
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const {FRIENDLY_MIRROR_SERIAL_BASE}=await import("../src/friendly-battle.js");
const {FRIENDLY_GEM_SERIAL_BASE}=await import("../src/friendly-battle-gems.js");
const directory=mkdtempSync(path.join(tmpdir(),"blustone-friendly-state-")),clock=Date.now;
let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),gems=[{id:"AUTHORED_FRIEND_GEM",name:"Authored Gem",desc:"Local test data",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1 as const}];
  const options={friendlyBattleMode:"local-owned-defense",gemReferences:gems} as const,state=new ServerState("http://localhost",file,options);
  const a=state.registerGuest({device_id:"friendly-a",nickname:"Local attacker"},{}).ret_data as any;
  const b=state.registerGuest({device_id:"friendly-b",nickname:"Real local friend"},{}).ret_data as any;
  const c=state.registerGuest({device_id:"friendly-c"},{}).ret_data as any;
  const games=(state as any).gameByPvid,accounts=(state as any).accountsByPvid;
  const attacker=games.get(a.pvid),defender=games.get(b.pvid),ids=attacker.starter_cards.map((row:any)=>row.inst_id);
  assert.deepEqual(ids,defender.starter_cards.map((row:any)=>row.inst_id),"Fixture demonstrates actual per-account ID collision");
  attacker.decks.push({type:4,list:[ids[1],ids[0],0,0,0]});
  defender.decks.push({type:5,list:[ids[0],ids[1],0,0,0]});
  defender.starter_cards[0].private_note="SECRET_NEVER_RETURN";accounts.get(b.pvid).extraData={secret:"PRIVATE_ACCOUNT_NEVER_RETURN"};
  const call=(who:any,route:string,extra={})=>gameResponse(state,route,{...who,...extra}) as any;
  const prep=(extra={})=>call(a,"/world/GetFriendlyBattleInfo",{target_pvid:b.pvid,...extra});
  (state as any).persist();const snapshot=()=>({file:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),graph:structuredClone((state as any).socialFriends)});
  const exact=(before:ReturnType<typeof snapshot>)=>{assert.deepEqual(readFileSync(file),before.file);assert.deepEqual([...games],before.games);assert.deepEqual([...accounts],before.accounts);assert.deepEqual((state as any).socialFriends,before.graph);};
  let before=snapshot();assert.equal(prep().result_code,10177);exact(before);
  assert.throws(()=>call({},"/world/GetFriendlyBattleInfo",{target_pvid:b.pvid}),/authenticated|account/i);exact(before);
  assert.throws(()=>call({...a,pvid:b.pvid},"/world/GetFriendlyBattleInfo",{target_pvid:b.pvid}),/identity|pvid|account/i);exact(before);
  const request=call(a,"/relation/FriendRequest",{target_pvid:b.pvid});assert.equal(request.result_code,1);
  before=snapshot();assert.equal(prep().result_code,10177);exact(before);
  assert.equal(call(b,"/relation/FriendReqAccept",{target_friend_id:request.ret_data.friend_id}).result_code,1);
  now+=86400000; // Deliberately expired resource clocks remain untouched.
  before=snapshot();const first=prep();assert.equal(first.result_code,1);exact(before);
  const rival=first.ret_data.rival;
  assert.deepEqual(Object.keys(rival.deck),["inst_1","inst_2","inst_3","inst_4","inst_5"]);
  assert.equal(rival.battle.pvid,b.pvid);assert.equal(rival.nickname,accounts.get(b.pvid).nickname);assert.equal(rival.battle.rank,0);
  for(let i=0;i<2;i++) {
    assert.equal(rival.deck[`inst_${i+1}`].inst_id,FRIENDLY_MIRROR_SERIAL_BASE+i);
    const original={...defender.starter_cards[i]};delete original.private_note;
    assert.deepEqual(rival.deck[`inst_${i+1}`],{...original,inst_id:FRIENDLY_MIRROR_SERIAL_BASE+i});
  }
  assert.equal(JSON.stringify(first).includes("SECRET_NEVER_RETURN"),false);assert.equal(JSON.stringify(first).includes("PRIVATE_ACCOUNT_NEVER_RETURN"),false);
  assert.deepEqual(rival.deck.inst_3,{inst_id:0});assert.deepEqual(rival.gem,[]);
  rival.deck.inst_1.exp=999;assert.notEqual(defender.starter_cards[0].exp,999);
  mkdirSync(file+".tmp");try{assert.equal(prep().result_code,1);exact(before);}finally{rmdirSync(file+".tmp");}
  for(const extra of [{target_pvid:a.pvid},{target_pvid:c.pvid},{target_pvid:"01"},{target_pvid:9000001},{deck_type:1},{rival:{}},{fee:0}]) {
    before=snapshot();assert.notEqual(prep(extra).result_code,1);exact(before);
  }
  const actorDeck=attacker.decks;attacker.decks=attacker.decks.filter((row:any)=>row.type!==4);before=snapshot();assert.notEqual(prep().result_code,1);exact(before);attacker.decks=actorDeck;
  const peerDeck=defender.decks;defender.decks=defender.decks.filter((row:any)=>row.type!==5);before=snapshot();assert.notEqual(prep().result_code,1);exact(before);defender.decks=peerDeck;
  accounts.get(b.pvid).socialBlocks={[a.pvid]:"attacker"};before=snapshot();assert.equal(prep().result_code,10177);exact(before);delete accounts.get(b.pvid).socialBlocks;
  accounts.get(a.pvid).socialBlocks={[b.pvid]:"defender"};before=snapshot();assert.equal(prep().result_code,10177);exact(before);delete accounts.get(a.pvid).socialBlocks;
  const server=accounts.get(b.pvid).serverId;accounts.get(b.pvid).serverId=server+1;before=snapshot();assert.notEqual(prep().result_code,1);exact(before);accounts.get(b.pvid).serverId=server;
  attacker.arena.active={};before=snapshot();assert.notEqual(prep().result_code,1);exact(before);attacker.arena.active=null;
  // Mounted native Gem values and target relation survive both response aliases.
  const stats={rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),hp:"12500",atk:"700"};
  const abilities={level_up_failed:0,main:stats,sub:[]};
  const gem={ref_id:gems[0].id,inst_id:"9007199254740993",rank:1,level:2,position:1,target_inst_id:String(ids[0]),ability:JSON.stringify(abilities),abilities};
  defender.owned_gems=[gem];(state as any).persist();before=snapshot();const mounted=prep();assert.equal(mounted.result_code,1);exact(before);
  const projected=mounted.ret_data.rival.gem;assert.equal(projected.length,1);assert.equal(projected[0].inst_id,FRIENDLY_GEM_SERIAL_BASE);assert.equal(projected[0].target_inst_id,FRIENDLY_MIRROR_SERIAL_BASE);
  const nativeOriginal=parseGemInstances({result_code:1,ret_data:[gem]},gems,new Set(ids.map(String)))[0];
  const nativeMirror=parseGemInstances({result_code:1,ret_data:projected},gems,new Set([String(FRIENDLY_MIRROR_SERIAL_BASE),String(FRIENDLY_MIRROR_SERIAL_BASE+1)]))[0];
  assert.deepEqual(projectGemStats(nativeMirror,gems),projectGemStats(nativeOriginal,gems));
  assert.equal(projected[0].ability,gem.ability);assert.deepEqual(projected[0].abilities,gem.abilities);
  // A reserved alias already present in any Gem inventory refuses, never renumbers stored IDs.
  attacker.owned_gems=[{...gem,inst_id:String(FRIENDLY_GEM_SERIAL_BASE),target_inst_id:"0",position:0}];before=snapshot();assert.notEqual(prep().result_code,1);exact(before);delete attacker.owned_gems;
  (state as any).persist();const durable=readFileSync(file),restarted=new ServerState("http://localhost",file,options);
  assert.equal((gameResponse(restarted,"/world/GetFriendlyBattleInfo",{...a,target_pvid:b.pvid}) as any).result_code,1);assert.deepEqual(readFileSync(file),durable);
  const disabled=new ServerState("http://localhost",file,{gemReferences:gems});assert.notEqual(gameResponse(disabled,"/world/GetFriendlyBattleInfo",{...a,target_pvid:b.pvid}).result_code,1);assert.deepEqual(readFileSync(file),durable);
  console.log("Friendly preparation: accepted real friend, explicit attack/defense, collision-free card/Gem response aliases, preserved effects/skills, zero energy/persistence/reward mutation and restart passed; native scene validation pending");
}finally{Date.now=clock;rmSync(directory,{recursive:true,force:true});}
