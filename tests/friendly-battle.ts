import assert from "node:assert/strict";
import {friendlyTargetPvid,friendlyBattleRival,friendlyBattleAttackReady,FRIENDLY_MIRROR_SERIAL_BASE} from "../src/friendly-battle.js";
import {FRIENDLY_GEM_SERIAL_BASE} from "../src/friendly-battle-gems.js";
import {cardInstance,starterReference,starterBookReference} from "../src/bootstrap.js";
import {createLocalGameState} from "../src/game.js";
import {CARD_INSTANCE_LIMIT} from "../src/card-instance-namespace.js";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
import type {GemReference} from "../src/gem-instances.js";

const known=new Set(starterReference.map(row=>row.base.id));
const peer={pvid:123,nickname:"Friend 🌟",profile_status:"Ready",arenaComments:{start_message:"Hello",win_message:"Good game",lose_message:"Again soon"}};
const occupied=new Set<number|string>([1_000_001,1_000_002,900_000_001,9_000_001_001,"18446744073709551615"]);
const fresh=()=>{
  const game=createLocalGameState();
  game.recruited_cards=[cardInstance(1000101,"002",2),cardInstance(1000102,"003",3),cardInstance(1000103,"004",1),cardInstance(1000104,"005",2),cardInstance(1000105,"006",1)];
  game.recruited_cards[0].exp=321;game.recruited_cards[0].skill_1_level=7;
  game.leader_inst_id=1000105;game.decks.push({type:5,list:[1000101,0,1000102,0,1000105]});
  game.exp=77;game.vip_exp=20;game.arena.win=3;game.arena.lose=2;game.arena.rating_point=30;
  return game;
};
assert.equal(friendlyTargetPvid("123"),123);assert.equal(friendlyTargetPvid(0xffff_ffff),0xffff_ffff);
for(const raw of [undefined,null,0,-1,1.5,true,NaN,Infinity,"", "01","+1"," 1","1.0","1e0","4294967296",4294967296,[],{}])
  assert.throws(()=>friendlyTargetPvid(raw));
assert.ok(FRIENDLY_MIRROR_SERIAL_BASE>CARD_INSTANCE_LIMIT);assert.ok(FRIENDLY_MIRROR_SERIAL_BASE>9_000_001_005);
const game=fresh(),before=structuredClone(game),peerBefore=structuredClone(peer),occupiedBefore=[...occupied];
const rival=friendlyBattleRival(peer,game,known,occupied);
assert.deepEqual(game,before);assert.deepEqual(peer,peerBefore);assert.deepEqual([...occupied],occupiedBefore);
assert.equal(rival.nickname,peer.nickname);assert.equal(rival.profile_status,peer.profile_status);assert.equal(rival.thumbnail,"006");assert.equal(rival.status,1);
assert.equal(rival.user_exp,77);assert.equal(rival.vip_exp,20);assert.deepEqual(rival.chain_bonus,[]);
assert.deepEqual(rival.card_book,{atk:0,def:0,hp:0,crt_dmg:0,crt_chance:0});assert.deepEqual(rival.gem,[]);
assert.deepEqual(rival.battle,{pvid:123,rank:0,season_no:1,weekly_no:1,league_level:1,rating_point:30,league_win:0,win:3,lose:2,refresh_datetime:0,...peer.arenaComments});
assert.deepEqual(Object.keys(rival.deck),["inst_1","inst_2","inst_3","inst_4","inst_5"]);
assert.deepEqual(rival.deck.inst_1,{...game.recruited_cards[0],inst_id:FRIENDLY_MIRROR_SERIAL_BASE});
assert.deepEqual(rival.deck.inst_2,{inst_id:0});assert.deepEqual(rival.deck.inst_4,{inst_id:0});
assert.deepEqual(rival.deck.inst_3,{...game.recruited_cards[1],inst_id:FRIENDLY_MIRROR_SERIAL_BASE+2});
assert.deepEqual(rival.deck.inst_5,{...game.recruited_cards[4],inst_id:FRIENDLY_MIRROR_SERIAL_BASE+4});
(rival.deck.inst_1 as Record<string,string|number>).exp=999;rival.card_book.atk=999;rival.battle.start_message="changed";
assert.deepEqual(game,before);assert.deepEqual(peer,peerBefore);
assert.equal(friendlyBattleRival(peer,game,known,occupied).card_book.atk,0);
const fallback=fresh();fallback.leader_inst_id=fallback.starter_cards[0].inst_id;assert.equal(friendlyBattleRival(peer,fallback,known,occupied).thumbnail,"002");
const privateGame=fresh();(privateGame.recruited_cards[0] as any).private_account_token="PRIVATE";
let privateReads=0;Object.defineProperty(privateGame.recruited_cards[0],"private_device",{enumerable:true,configurable:true,get(){privateReads++;return "PRIVATE";}});
const publicRival=friendlyBattleRival(peer,privateGame,known,occupied);assert.equal(privateReads,0);
assert.equal("private_account_token" in publicRival.deck.inst_1,false);assert.equal("private_device" in publicRival.deck.inst_1,false);
assert.equal(JSON.stringify(publicRival).includes("PRIVATE"),false);
const malformed=fresh();let nativeReads=0;Object.defineProperty(malformed.recruited_cards[0],"exp",{enumerable:true,configurable:true,get(){nativeReads++;throw new Error("must not execute");}});
assert.throws(()=>friendlyBattleRival(peer,malformed,known,occupied),/own data fields/);assert.equal(nativeReads,0);
const refusal=(change:(game:ReturnType<typeof fresh>)=>void)=>{
  const candidate=fresh();change(candidate);const copy=structuredClone(candidate);assert.throws(()=>friendlyBattleRival(peer,candidate,known,occupied));assert.deepEqual(candidate,copy);
};
refusal(g=>{g.decks=g.decks.filter(row=>row.type!==5);});
refusal(g=>{g.decks.push({type:5,list:[1000101,0,0,0,0]});});
refusal(g=>{g.decks.find(row=>row.type===5)!.list=[];});
refusal(g=>{g.decks.find(row=>row.type===5)!.list=[0,0,0,0,0];});
refusal(g=>{g.decks.find(row=>row.type===5)!.list=[1000101,1000101,0,0,0];});
refusal(g=>{g.decks.find(row=>row.type===5)!.list=[999999,0,0,0,0];});
refusal(g=>{delete g.decks.find(row=>row.type===5)!.list[1];});
refusal(g=>{g.recruited_cards.push({...g.recruited_cards[0]});});
refusal(g=>{g.recruited_cards[0].ref_id="UNKNOWN";});
refusal(g=>{g.recruited_cards[0].rank=99;});
refusal(g=>{g.recruited_cards[0].awk_step=1;});
refusal(g=>{g.recruited_cards[0].skill_1_level=0x1_0000_0000;});
refusal(g=>{g.recruited_cards[0].skin_ref_id="\ud800";});
refusal(g=>{g.recruited_cards[0].lock=2;});
refusal(g=>{delete (g.recruited_cards[0] as any).armor_rank;});
refusal(g=>{g.recruited_cards[0].weapon_level=2;});
refusal(g=>{g.leader_inst_id=999999;});
refusal(g=>{g.arena.win=0x1_0000_0000;});
refusal(g=>{g.exp=-1;});
for(const value of [FRIENDLY_MIRROR_SERIAL_BASE,String(FRIENDLY_MIRROR_SERIAL_BASE)])
  assert.throws(()=>friendlyBattleRival(peer,fresh(),known,new Set([value])),/serial collision/);
for(const value of [0,"01","18446744073709551616",Number.MAX_SAFE_INTEGER+1])assert.throws(()=>friendlyBattleRival(peer,fresh(),known,new Set([value])));
assert.throws(()=>friendlyBattleRival({...peer,pvid:0},fresh(),known,occupied));
assert.throws(()=>friendlyBattleRival({...peer,nickname:"\0name"},fresh(),known,occupied));
assert.throws(()=>friendlyBattleRival({...peer,arenaComments:{...peer.arenaComments,win_message:""}},fresh(),known,occupied));
const oldEffect=starterBookReference[0].effect;
try{starterBookReference[0].effect=JSON.stringify({atk:1,def:0,hp:0,crt_chance:0,crt_dmg:0});assert.throws(()=>friendlyBattleRival(peer,fresh(),known,occupied),/Nonneutral/);}
finally{starterBookReference[0].effect=oldEffect;}
const reference=starterReference.find(row=>row.base.id==='002')!,oldEquipment=reference.equipment;
const equipmentStats=Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"]));
try {
  (reference as any).equipment=[1,2,3].map(type=>({id:"AUTHORED_EQUIP_"+type,type,rank:1,awk_step:0,...equipmentStats}));
  const equipped=fresh();equipped.recruited_cards[0].weapon_level=2;
  assert.equal(friendlyBattleRival(peer,equipped,known,occupied).deck.inst_1.weapon_level,2,"Configured exact equipment metadata preserves actual fields");
}finally{reference.equipment=oldEquipment;}
const gemRef:GemReference={id:"AUTHORED_GEM",name:"Owned Gem",desc:"",res_id:"AUTHORED_RESOURCE",set_effect_id:1,rank:1,target:1};
const gemStat={rank:1,awk_step:0,...equipmentStats,hp:"123.45",spd:"7.5"};
const gems=fresh();gems.owned_gems=[{ref_id:gemRef.id,inst_id:"9007199254740993",rank:1,level:2,position:1,target_inst_id:"1000101",ability:"opaque",
  abilities:{level_up_failed:3,main:gemStat,sub:[]},private_roll_note:"PRIVATE"},
  {ref_id:gemRef.id,inst_id:7,rank:1,level:1,position:0,target_inst_id:0,ability:"",abilities:null}];
const gemsBefore=structuredClone(gems);assert.throws(()=>friendlyBattleRival(peer,gems,known,occupied),/Gem reference/);
const gemRival=friendlyBattleRival(peer,gems,known,occupied,[gemRef]);assert.equal(gemRival.gem.length,1);
assert.equal(gemRival.gem[0].inst_id,FRIENDLY_GEM_SERIAL_BASE);assert.equal(gemRival.gem[0].target_inst_id,FRIENDLY_MIRROR_SERIAL_BASE);
const emittedMain=gemRival.gem[0].abilities!.main as Record<string,unknown>;
assert.equal(emittedMain.hp,"123.45");assert.equal(emittedMain.spd,"7.5");
assert.equal("private_roll_note" in gemRival.gem[0],false);emittedMain.hp="999";assert.deepEqual(gems,gemsBefore);
assert.throws(()=>friendlyBattleRival(peer,gems,known,new Set([String(FRIENDLY_GEM_SERIAL_BASE)]),[gemRef]),/Gem alias/);
const actor=fresh();const actorNoDeck=structuredClone(actor);assert.throws(()=>friendlyBattleAttackReady(actor,known),/deck4/);assert.deepEqual(actor,actorNoDeck);
actor.decks.push({type:4,list:[1000101,0,1000102,0,1000105]});const actorBefore=structuredClone(actor);friendlyBattleAttackReady(actor,known);assert.deepEqual(actor,actorBefore);
actor.owned_gems=structuredClone(gems.owned_gems);assert.throws(()=>friendlyBattleAttackReady(actor,known),/Gem reference/);friendlyBattleAttackReady(actor,known,[gemRef]);
actor.recruited_cards[0].armor_level=2;assert.throws(()=>friendlyBattleAttackReady(actor,known,[gemRef]),/equipment/);
console.log("Friendly rival pure model: exact target parser, explicit five-slot defense/attack readiness, detached whitelisted owned cards, collision-checked card/Gem mirrors and mounted effects, no private fields, neutral effects, grade/gear/counter refusals and input preservation passed.");
