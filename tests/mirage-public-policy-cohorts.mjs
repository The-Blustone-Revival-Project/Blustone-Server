import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Public AUTHORED LOCAL recipe; real compiled methods, disposable owned accounts.
// No native outcome is claimed by these supplied End packets.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policyFile=path.join(root,'config/policies/mirage-local-zero-reward.json'),policyBytes=readFileSync(policyFile),policy=JSON.parse(policyBytes);
const profileFile=path.join(root,'config/profiles/current-restoration-fever-compatible-progression.json'),profileBytes=readFileSync(profileFile),profile=JSON.parse(profileBytes);
const previous={...process.env},realNow=Date.now,dir=mkdtempSync(path.join(tmpdir(),'blustone-public-mirage-cohorts-')),file=path.join(dir,'state.json');
const read=()=>JSON.parse(readFileSync(file));
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,profile.env,{BLUSTONE_TEAM_LEVEL_PROFILE:'local-linear-100',BLUSTONE_RUPEE_SHOP_MODE:'archive-2021-base-only',BLUSTONE_RUPEE_SHOP_DAILY_LIMIT:'3'});
  delete process.env.BLUSTONE_STATE_FILE;
  for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_CATALOG_PATH'])process.env[key]=path.resolve(root,profile.env[key]);
  Date.now=()=>1800000000000;
  const compiled=name=>import(pathToFileURL(path.join(root,'dist/src/'+name+'.js')).href);
  const {createApp}=await compiled('server'),{gameResponse}=await compiled('game-routes');
  const {validatedMiragePolicy}=await compiled('mirage-run'),{requireMirageCombatCache}=await compiled('mirage-cache'),{mirageRuntimeContext}=await compiled('mirage-runtime-context');
  const {starterReference,starterLevels}=await compiled('bootstrap');
  assert.equal(profile.expectedPackages,170);assert.equal(starterReference.length,22);assert.equal(starterLevels.user.filter(r=>r.min_exp<=1500).length,16);
  assert.deepEqual(validatedMiragePolicy(policy),policy);
  const enemy={ref_id:'003',hp_percent:10000,rank:3,rank_up_cnt:0,overcome_cnt:0,exp:0,
    skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:0,skill_5_level:0};
  assert.deepEqual(policy,{enrollment:'rank-exp-id-projection',floor:1,bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],
    stairs:[0,1,2].map(()=>({grade:0,balance:10000,enemies:[enemy],gold:0})),hero:{bonus:0,end_ltime:2147483647,cur:[],next:[]}});
  const load=mode=>createApp({baseUrl:'http://localhost',stateFile:file,mirageMode:mode,
    ...(mode==='local-configured'?{miragePolicy:policy}:{})}).state;
  let state=load('disabled');
  const actors=[0,1,2].map(i=>{const r=state.registerGuest({device_id:'public-mirage-dummy-'+i},{}).ret_data;return {pvid:r.pvid,otp:r.otp};});
  const game=actor=>state.gameFor(state.accountFor(actor,{}));
  process.env.BLUSTONE_RECRUIT_CARD='003';const recruited=state.gachaPremium({...actors[0],cnt:1,item_inst_id:0},{});
  assert.equal(recruited.ret_data.card.rank,3);
  const duplicate=state.gachaPremium({...actors[0],cnt:1,item_inst_id:0},{});
  assert.equal(duplicate.ret_data.card.rank,3);assert.notEqual(duplicate.ret_data.card.inst_id,recruited.ret_data.card.inst_id);
  for(const actor of actors)game(actor).exp=1500;state.persist();assert.equal(read().version,1);
  const beforePurchase=structuredClone(game(actors[0]));
  const purchase=gameResponse(state,'/shop/BuyGlobalItem',{...actors[0],target_ref_id:'local_rupee_pack',qty:1,price_type:1,item_inst_id:0},{});
  assert.equal(purchase.result_code,1);assert.equal(game(actors[0]).gold,beforePurchase.gold+5000);
  assert.equal(game(actors[0]).gacha_free_qty,beforePurchase.gacha_free_qty-5);
  const schema8=read();assert.equal(schema8.version,8);const baselineGames=structuredClone(schema8.gameStates),baselineAccounts=structuredClone(schema8.accounts);
  const counter=baselineAccounts.find(a=>a.pvid===actors[0].pvid).rupeeShopCounter;assert.equal(counter.manda,1);assert.equal(counter.coupon,0);
  state=load('local-configured');assert.deepEqual(read(),schema8,'Enabling alone neither enrolls nor rewrites schema8');
  const call=(actor,route,payload={})=>{const r=gameResponse(state,'/mirage/'+route,{...actor,...payload},{});assert.equal(r.result_code,1,JSON.stringify(r));return r.ret_data;};
  const leaderPacket=actor=>({...actor,target_inst_id:game(actor).leader_inst_id});
  const held=actor=>{
    const bytes=readFileSync(file);assert.equal(state.mirageBlocks('/world/SetLeader',leaderPacket(actor),{}),true);
    assert.equal(gameResponse(state,'/world/SetLeader',leaderPacket(actor),{}).result_code,2001);assert.deepEqual(readFileSync(file),bytes);
  };
  const released=actor=>{
    assert.equal(state.mirageBlocks('/world/SetLeader',leaderPacket(actor),{}),false);
    const bytes=readFileSync(file);assert.equal(gameResponse(state,'/world/SetLeader',leaderPacket(actor),{}).result_code,1);assert.deepEqual(readFileSync(file),bytes);
  };
  const enroll=actor=>{
    const info=call(actor,'GetInfo');assert.equal(info.ref_stair.list.length,3);assert.deepEqual(info.inst_enemy,[enemy]);assert.deepEqual(info.inst_base.deck,[]);
    assert.ok(1800000000>info.inst_base.begin_ltime+86400,'Native Retry wire clock is ready');
    assert.equal(read().version,12);assert.deepEqual(read().accounts,baselineAccounts,'Schema12 retains exact Rupee account journal');
    const run=read().mirageRuns.find(([id])=>id===actor.pvid)[1];assert.deepEqual(run.policy,policy);
    const selected=new Set(info.entry.map(row=>row.id));
    for(const card of [...game(actor).starter_cards,...game(actor).recruited_cards])assert.equal(card.mirage_remain_hp,selected.has(card.inst_id)?10000:-1);
    if(actor.pvid===actors[0].pvid){assert.ok(selected.has(recruited.ret_data.card.inst_id));assert.equal(selected.has(duplicate.ret_data.card.inst_id),false);}
    held(actor);const ids=info.entry.map(row=>row.id);assert.ok(ids.length>=2);
    const beforeReload=readFileSync(file);state=load('local-configured');assert.deepEqual(readFileSync(file),beforeReload);
    assert.deepEqual(call(actor,'GetInfo'),info,'Reload retains HP, cache and Rupee journal');
    assert.deepEqual(call(actor,'RegisterDeck',{inst_list:JSON.stringify(ids)}),ids);
    const cache=call(actor,'GetInfo');requireMirageCombatCache(cache,mirageRuntimeContext(game(actor),cache,1800000000));return ids;
  };
  const ids=enroll(actors[0]),gold=game(actors[0]).gold;
  for(let stair=1;stair<=3;stair++) {
    const hp=9500-stair*500,packet={floor:'1',stair:String(stair),remain_deck_hp:JSON.stringify(ids.map(inst_id=>({inst_id,hp_percent:hp}))),remain_enemy_hp:'[0]'};
    const end=call(actors[0],'End',packet);assert.equal(end.state,2);assert.deepEqual(end.deck,ids.map(inst_id=>({inst_id,remain_hp_percent:hp})));
    const ended=readFileSync(file);assert.deepEqual(call(actors[0],'End',packet),end);assert.deepEqual(readFileSync(file),ended);
    const reward=call(actors[0],'Reward',{floor:'1',stair:String(stair)});assert.deepEqual(reward.user.gold,{prev:gold,cur:gold});
    assert.equal(reward.state,stair===3?0:1);assert.equal(reward.cur_stair,Math.min(stair+1,3));
    assert.deepEqual(reward.inst_enemy,stair===3?[{...enemy,hp_percent:0}]:[enemy]);
    const claimed=readFileSync(file);assert.deepEqual(call(actors[0],'Reward',{floor:'1',stair:String(stair)}),reward);assert.deepEqual(readFileSync(file),claimed);
    assert.deepEqual(read().accounts,baselineAccounts);
  }
  released(actors[0]);assert.deepEqual(read().gameStates,baselineGames,'Full completion returns all owned HP and preserves all baseline games');
  const deadIds=enroll(actors[1]);
  call(actors[1],'End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify(deadIds.map(inst_id=>({inst_id,hp_percent:0}))),remain_enemy_hp:'[10000]'});
  const deadBytes=readFileSync(file),deadInfo=call(actors[1],'GetInfo');state=load('disabled');
  assert.deepEqual(readFileSync(file),deadBytes);assert.deepEqual(call(actors[1],'GetInfo'),deadInfo);held(actors[1]);
  assert.equal(gameResponse(state,'/mirage/GetInfo',{...actors[1],reset:'1',stay:'1'},{}).result_code,2001);
  assert.deepEqual(readFileSync(file),deadBytes,'Disabled reads retain exact dead carry and active commitments');
  state=load('local-configured');
  const abandon=actor=>{
    assert.equal(call(actor,'GetNextFloor').next_floor,1);
    const out=call(actor,'GetInfo',{reset:'1',stay:'1',entry:'1',inst_base:'1',inst_enemy:'1',ref_stair_list:'1',ref_hero:'1'});
    assert.equal(out.inst_base.state,0);assert.deepEqual(out.entry,[]);assert.deepEqual(out.inst_base.deck,[]);released(actor);
  };
  abandon(actors[1]);enroll(actors[2]);state=load('disabled');held(actors[2]);state=load('local-configured');abandon(actors[2]);
  const final=read();assert.equal(final.version,12);assert.equal(final.mirageRuns.length,3);
  assert.deepEqual(final.accounts,baselineAccounts);assert.deepEqual(final.gameStates,baselineGames,'Three complete dummy games and Rupee purchase survive completion/dead/crash release');
  const finalBytes=readFileSync(file);state=load('disabled');for(const actor of actors){assert.equal(call(actor,'GetInfo').inst_base.state,0);released(actor);}
  assert.deepEqual(readFileSync(file),finalBytes);assert.deepEqual(readFileSync(policyFile),policyBytes);assert.deepEqual(readFileSync(profileFile),profileBytes);
  console.log('Public LOCAL Mirage recipe: compiled170/team16/Rupee2021cap3 actual purchase schema8 -> schema12 coexistence, exact Rupee counter/three-game retention, owned party/three zero-gold End+Reward replays, disabled holds, native-equivalent dead/crash abandonment and final releases passed; no native combat claim.');
}finally{
  for(const key of Object.keys(process.env))if(!Object.hasOwn(previous,key))delete process.env[key];Object.assign(process.env,previous);Date.now=realNow;rmSync(dir,{recursive:true,force:true});
}
