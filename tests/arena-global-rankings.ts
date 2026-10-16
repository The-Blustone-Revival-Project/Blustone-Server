import assert from 'node:assert/strict';
import {globalArenaPage} from '../src/arena-global-rankings.js';
import {localArenaStandings} from '../src/arena-rankings.js';
import {ownedDefenseRival,friendlyBattleRival,friendlyTargetPvid} from '../src/friendly-battle.js';
import {starterReference} from '../src/bootstrap.js';
import {createLocalGameState} from '../src/game.js';

const standings=localArenaStandings([{pvid:11,rating_point:10,win:1,lose:0},{pvid:12,rating_point:30,win:3,lose:0},{pvid:13,rating_point:30,win:3,lose:1}]),before=structuredClone(standings),all=new Set([11,12,13]);
assert.deepEqual(globalArenaPage(standings,all,{page:'1',page_scale:'2'}),standings.slice(0,2));
assert.deepEqual(globalArenaPage(standings,all,{page:2,page_scale:2}),standings.slice(2));
assert.deepEqual(globalArenaPage(standings,new Set([11,13]),{page:1,page_scale:2}).map(row=>row.rank),[2,3]);
assert.deepEqual(globalArenaPage(standings,all,{page:0xffff_ffff,page_scale:100}),[],'Huge native U32 page is exact and cannot wrap to page1');
for(const bad of [undefined,null,true,false,0,-1,1.5,NaN,Infinity,'','01','1.0','1e0','+1',' 1','4294967296',4294967296]){
 assert.throws(()=>globalArenaPage(standings,all,{page:bad,page_scale:10}));
 assert.throws(()=>globalArenaPage(standings,all,{page:1,page_scale:bad}));
}
assert.throws(()=>globalArenaPage(standings,all,{page:1,page_scale:101}));
assert.throws(()=>globalArenaPage([...standings].reverse(),all,{page:1,page_scale:10}));
assert.throws(()=>globalArenaPage(standings.map(row=>({...row,rank:1})),all,{page:1,page_scale:10}));
let getter=false;const raw={page_scale:10};Object.defineProperty(raw,'page',{enumerable:true,get(){getter=true;return 1;}});assert.throws(()=>globalArenaPage(standings,all,raw));assert.equal(getter,false);
const page=globalArenaPage(standings,all,{page:1,page_scale:10});page[0].rating_point=999;assert.deepEqual(standings,before);
const game=createLocalGameState(),refs=new Set(starterReference.map(row=>row.base.id)),ids=game.starter_cards.map(row=>row.inst_id);game.decks.push({type:5,list:[ids[0],ids[1],0,0,0]});
const gameBefore=structuredClone(game),peer={pvid:0x1_0000_0001,nickname:'Wide ranked captain',profile_status:''};
assert.equal(ownedDefenseRival(peer,game,refs,new Set()).battle.pvid,peer.pvid);
assert.equal(ownedDefenseRival({...peer,pvid:Number.MAX_SAFE_INTEGER},game,refs,new Set()).battle.pvid,Number.MAX_SAFE_INTEGER);
for(const pvid of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'4294967297','18446744073709551615'])assert.throws(()=>ownedDefenseRival({...peer,pvid} as any,game,refs,new Set()));
assert.throws(()=>friendlyBattleRival(peer,game,refs,new Set()),/uint32/);assert.throws(()=>friendlyTargetPvid(peer.pvid),/uint32/);
assert.deepEqual(game,gameBefore);
console.log('arena-global-rankings: exact bounded paging, stable rank gaps, huge-page arithmetic, detachment, safe full64 Defender identity and unchanged friendly U32 admission passed');
