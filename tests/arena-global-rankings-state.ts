import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {ARENA_RIVAL_PVID} from '../src/arena.js';
import {FRIENDLY_MIRROR_SERIAL_BASE} from '../src/friendly-battle.js';
import {FRIENDLY_GEM_SERIAL_BASE} from '../src/friendly-battle-gems.js';
import {GEM_STAT_KEYS} from '../src/gem-combinations.js';
import {repositoryPath} from '../src/paths.js';
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath('config/profiles/current-e6-gems.json'),'utf8')).env);

const directory=mkdtempSync(path.join(tmpdir(),'blustone-global-rank-')),file=path.join(directory,'state.json'),realNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try{
 const gemReferences=[{id:'LOCAL_RANK_GEM',name:'Local rank test Gem',desc:'Authored test data',res_id:'G_1_001_R1',set_effect_id:1,rank:1,target:1 as const}];
 const state=new ServerState('http://localhost',file,{gemReferences}),self=state.registerGuest({device_id:'global-self'},{}).ret_data as any;
 const peer=state.registerGuest({device_id:'global-peer'},{}).ret_data as any,other=state.registerGuest({device_id:'global-other'},{}).ret_data as any;
 const fresh=state.registerGuest({device_id:'global-fresh'},{}).ret_data as any,cross=state.registerGuest({device_id:'global-cross'},{}).ret_data as any;
 const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
 const call=(who:any,name:string,extra:Record<string,unknown>={},s=state)=>gameResponse(s,'/arena/'+name,{...who,...extra}) as any;
 const global=(extra:Record<string,unknown>={},s=state)=>call(self,'GetGlobalRankList',{page:'1',page_scale:'10',...extra},s);
 const snapshot=()=>{const refs:{root:any;keys:string[];value:any}[]=[];const walk=(root:any,value:any,keys:string[]=[])=>{if(!value||typeof value!=='object')return;refs.push({root,keys,value});for(const [key,child]of Object.entries(value))walk(root,child,[...keys,key]);};for(const value of [...games.values(),...accounts.values()])walk(value,value);return{bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),entries:[...games],refs};};
 const unchanged=(b:ReturnType<typeof snapshot>)=>{assert.deepEqual(readFileSync(file),b.bytes);assert.deepEqual([...games],b.games);assert.deepEqual([...accounts],b.accounts);b.entries.forEach(([id,g])=>assert.equal(games.get(id),g));for(const {root,keys,value}of b.refs)assert.equal(keys.reduce((row,key)=>row[key],root),value,keys.join('.'));};
 const immutable=(action:()=>any)=>{const b=snapshot(),r=action();unchanged(b);return r;};
 assert.throws(()=>gameResponse(state,'/arena/GetGlobalRankList',{page:1,page_scale:10}),/authenticated/);
 assert.equal(immutable(()=>global()).result_code,2001,'Fresh self lacks explicit defense5; no fallback deck or guest rival is fabricated');
 const earn=(who:any,count:number)=>{assert.equal(call(who,'Enter').result_code,1);for(let i=0;i<count;i++){
  assert.equal(call(who,'BattleStart',{target_pvid:ARENA_RIVAL_PVID,bid:0,is_revenge:0,is_friendship:0}).result_code,1);
  assert.equal(call(who,'BattleComplete',{target_pvid:ARENA_RIVAL_PVID,is_revenge:0,play_info:JSON.stringify({is_win:1,clear_time:10,dead_cnt:0,player_total_hp:100,player_total_hp_max:100,enemy_total_hp:0,enemy_total_hp_max:300,atk_max:181,atk_total:300,atk_cnt:2})}).result_code,1);
 }};
 earn(self,1);earn(peer,3);earn(other,3);earn(cross,4);accounts.get(cross.pvid).serverId=accounts.get(self.pvid).serverId+1;
 assert.deepEqual([self,peer,other,cross].map(who=>games.get(who.pvid).arena.rating_point),[10,30,30,40]);
 const defender=games.get(peer.pvid),slots=defender.decks.find((row:any)=>row.type===5).list;slots.reverse();
 defender.starter_cards[0].private_note='PRIVATE_CARD_EXTRA';accounts.get(peer.pvid).extraData={private_key:'PRIVATE_ACCOUNT_EXTRA'};
 accounts.get(peer.pvid).profileSettings={info_message:'Actual ranked captain',rename_count:1};
 assert.equal(call(peer,'SaveComment',{comment_info:'{"win_message":"Clear skies"}'}).result_code,1);
 const stats={rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,'0'])),hp:'12500',atk:'700'},abilities={level_up_failed:0,main:stats,sub:[]};
 defender.owned_gems=[{ref_id:gemReferences[0].id,inst_id:'9007199254740993',rank:1,level:2,position:1,target_inst_id:String(defender.starter_cards[0].inst_id),ability:JSON.stringify(abilities),abilities}];
 for(const game of games.values()){game.ap=1;game.bp=1;game.ap_updated_at=now-86400000;game.bp_updated_at=game.ap_updated_at;}(state as any).persist();
 const result=immutable(()=>global());assert.equal(result.result_code,1,JSON.stringify(result));assert.deepEqual(Object.keys(result.ret_data).sort(),['list','season_no']);assert.equal(result.ret_data.season_no,1);
 const rows=result.ret_data.list;assert.deepEqual(rows.map((r:any)=>r.battle.pvid),[peer.pvid,other.pvid,self.pvid]);assert.deepEqual(rows.map((r:any)=>r.battle.rank),[1,2,3]);assert.deepEqual(rows.map((r:any)=>r.battle.rating_point),[30,30,10]);
 assert.equal(rows.some((r:any)=>[ARENA_RIVAL_PVID,cross.pvid,fresh.pvid].includes(r.battle.pvid)),false);
 assert.deepEqual(Object.keys(rows[0]).sort(),['nickname','thumbnail','profile_status','country_code','status','user_exp','vip_exp','chain_bonus','card_book','battle','deck','gem'].sort());
 assert.equal(rows[0].profile_status,'Actual ranked captain');assert.equal(rows[0].battle.win_message,'Clear skies');assert.deepEqual(rows[0].chain_bonus,[]);assert.deepEqual(rows[0].card_book,{atk:0,def:0,hp:0,crt_dmg:0,crt_chance:0});
 assert.deepEqual(Object.keys(rows[0].deck),['inst_1','inst_2','inst_3','inst_4','inst_5']);
 slots.forEach((id:number,index:number)=>{const row=rows[0].deck['inst_'+(index+1)];if(!id)assert.deepEqual(row,{inst_id:0});else{const owned={...defender.starter_cards.find((card:any)=>card.inst_id===id)};delete owned.private_note;assert.deepEqual(row,{...owned,inst_id:FRIENDLY_MIRROR_SERIAL_BASE+index});}});
 const mountedSlot=slots.indexOf(defender.starter_cards[0].inst_id);assert.equal(rows[0].gem[0].inst_id,FRIENDLY_GEM_SERIAL_BASE);assert.equal(rows[0].gem[0].target_inst_id,FRIENDLY_MIRROR_SERIAL_BASE+mountedSlot);assert.deepEqual(rows[0].gem[0].abilities,abilities);
 assert.equal(JSON.stringify(result).includes('PRIVATE_'),false);
 assert.deepEqual(immutable(()=>global({page:1,page_scale:2})).ret_data.list.map((r:any)=>r.battle.pvid),[peer.pvid,other.pvid]);assert.deepEqual(immutable(()=>global({page:2,page_scale:2})).ret_data.list.map((r:any)=>r.battle.rank),[3]);assert.deepEqual(immutable(()=>global({page:0xffff_ffff,page_scale:100})).ret_data.list,[]);
 rows[0].deck.inst_5.exp=99999;rows[0].gem[0].abilities.main.hp='99999';assert.notEqual(defender.starter_cards[0].exp,99999);assert.equal(defender.owned_gems[0].abilities.main.hp,'12500');
 for(const extra of [{page:0},{page:'01'},{page:true},{page_scale:0},{page_scale:101},{page_scale:'1e1'}])assert.equal(immutable(()=>global(extra)).result_code,2001);
 // Every selected DTO validates before publishing any part of a page.
 const decks=games.get(other.pvid).decks;games.get(other.pvid).decks=decks.filter((row:any)=>row.type!==5);assert.equal(immutable(()=>global()).result_code,2001);assert.equal(immutable(()=>global({page:2,page_scale:2})).result_code,1);games.get(other.pvid).decks=decks;
 const priorRef=defender.starter_cards[0].ref_id;defender.starter_cards[0].ref_id='UNKNOWN';assert.equal(immutable(()=>global()).result_code,2001);defender.starter_cards[0].ref_id=priorRef;
 const missing=games.get(self.pvid);games.delete(self.pvid);assert.equal(immutable(()=>global()).result_code,2001);assert.equal(games.has(self.pvid),false);games.set(self.pvid,missing);
 // Existing profile visibility applies without renumbering remaining ranks.
 accounts.get(self.pvid).socialBlocks={[peer.pvid]:'ranked peer'};assert.deepEqual(immutable(()=>global()).ret_data.list.map((r:any)=>r.battle.rank),[2,3]);delete accounts.get(self.pvid).socialBlocks;
 accounts.get(peer.pvid).socialBlocks={[self.pvid]:'viewer'};assert.deepEqual(immutable(()=>global()).ret_data.list.map((r:any)=>r.battle.rank),[2,3]);delete accounts.get(peer.pvid).socialBlocks;
 // Native Defender uses full64 PVID; support exact SAFE account IDs aboveU32.
 const savedAccounts=[...accounts],savedGames=[...games],wide=0x1_0000_0001;accounts.delete(other.pvid);games.delete(other.pvid);accounts.set(wide,{...savedAccounts.find(([id])=>id===other.pvid)![1],pvid:wide});games.set(wide,savedGames.find(([id])=>id===other.pvid)![1]);
 const wideRows=immutable(()=>global()).ret_data.list;assert.equal(wideRows[1].battle.pvid,wide);assert.ok(JSON.stringify(wideRows).includes('"pvid":4294967297'));
 accounts.clear();savedAccounts.forEach(([id,a])=>accounts.set(id,a));games.clear();savedGames.forEach(([id,g])=>games.set(id,g));
 mkdirSync(file+'.tmp');try{assert.equal(immutable(()=>global()).result_code,1);}finally{rmdirSync(file+'.tmp');}
 const blocked=path.join(directory,'rename-blocked');mkdirSync(blocked);(state as any).stateFile=blocked;try{assert.equal(immutable(()=>global()).result_code,1);}finally{(state as any).stateFile=file;rmdirSync(blocked);}
 (state as any).persist();const durable=readFileSync(file),restart=new ServerState('http://localhost',file,{gemReferences});const again=global({},restart);assert.equal(again.result_code,1);assert.deepEqual(again.ret_data,global().ret_data);assert.deepEqual(readFileSync(file),durable);
 console.log('arena-global-rankings-state: actual earned local ratings/defenses/Gems, native complete page DTOs, ties/rank gaps/full64, mutual blocks/cross-realm/fixtures, whole-page refusal and no-write/no-clock restart passed');
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
