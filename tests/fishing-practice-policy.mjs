import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {FISHING_ART_SOURCE,verifyOriginalFishingArt} from '../scripts/resources/verify-fishing-art.mjs';

// All fish identity/economy/tuning/outcomes below are AUTHORED LOCAL practice.
// Actual compiled routes and real dummy purchases; positive ordinary logs only.
// Native tutorial admission/log-1 is separate and still blocks activation.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const recipeFiles=['items','catalogue','casts','sale-bindings'].map(name=>'config/policies/fishing-practice-'+name+'.json');
const recipeBytes=recipeFiles.map(file=>readFileSync(path.join(root,file)));
const [items,catalogue,casts,bindings]=recipeBytes.map(bytes=>JSON.parse(bytes));
const profileFile=path.join(root,'config/profiles/current-restoration-fever-compatible-progression.json'),profileBytes=readFileSync(profileFile),profile=JSON.parse(profileBytes);
const mirage=JSON.parse(readFileSync(path.join(root,'config/policies/mirage-local-zero-reward.json')));
const reentry=JSON.parse(readFileSync(path.join(root,'config/policies/mirage-local-zero-reward-reentry.json')));
const dir=mkdtempSync(path.join(tmpdir(),'blustone-fishing-practice-')),file=path.join(dir,'state.json'),savedEnv={...process.env},realNow=Date.now;
const read=()=>JSON.parse(readFileSync(file));
try {
  const fishPack=readFileSync(path.join(root,FISHING_ART_SOURCE.pack)),fishIndex=readFileSync(path.join(root,FISHING_ART_SOURCE.index));
  const art=verifyOriginalFishingArt(fishPack,fishIndex,items[0].thumbnail_id);
  assert.deepEqual(art.map(row=>row.name),['FS001','FS001_V']);
  assert.deepEqual(art.map(row=>row.sha256),['70eee5af4077a8843e333b88a6900907f7613a3f4040d34d31a8457e16730bf0','b6c6e2f012e7e3ae320b54af5b7a264c85667fba3b746f0100e7c99d60a68d3e']);
  for(const thumbnail of ['', 'FS999', 'FS001_V'])assert.throws(()=>verifyOriginalFishingArt(fishPack,fishIndex,thumbnail));
  const badPack=Buffer.from(fishPack);badPack[0]^=1;assert.throws(()=>verifyOriginalFishingArt(badPack,fishIndex,'FS001'));
  const badIndex=Buffer.from(fishIndex);badIndex[0]^=1;assert.throws(()=>verifyOriginalFishingArt(fishPack,badIndex,'FS001'));
  const selected=profile.env.BLUSTONE_PACKAGE_NAMES.split(',');assert.equal(selected.length,170);
  const ledger=JSON.parse(readFileSync(path.join(root,'resources/manifests/imported-files.json')));
  for(const name of ['FISH_LIST.jet','FISHING.jet','MGM_FISH.jet','LEVELING.jet']) {
    assert.ok(selected.includes(name),'Original fishing dependency must already be selected');
    const rows=ledger.filter(row=>row.destination==='resources/runtime/assets/'+name);assert.equal(rows.length,1);
    const bytes=readFileSync(path.join(root,rows[0].destination));assert.equal(bytes.length,rows[0].bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),rows[0].sha256);
  }
  const resourceProof=spawnSync(process.platform==='win32'?'python':'python3',['-B','-c',`
import sys,pathlib,importlib.util,json
root=pathlib.Path(sys.argv[1]);s=importlib.util.spec_from_file_location('j',root/'scripts/resources/jet-index.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
d=m.index_jet((root/'resources/runtime/assets/FISH_LIST.jet').read_bytes());assert d['sha256']=='ad5bedcc5cbea02dfe2a287374e70cd2261c2b5a212fdc124393ef908a19f18c';assert d['exact_eof']==d['bytes']
by={r['name']:r for r in d['resources']}
for name,digest,image in [('FS001','70eee5af4077a8843e333b88a6900907f7613a3f4040d34d31a8457e16730bf0','PQEORH'),('FS001_V','b6c6e2f012e7e3ae320b54af5b7a264c85667fba3b746f0100e7c99d60a68d3e','_T7L0E')]:
 r=by[name];assert r['payload_prefix_hex']=='5332' and r['sha256']==digest;p=r['s2projection'];assert p['supported'] and p['image_count']==1 and p['image_name']==image;assert by[image]['payload_prefix_hex']=='4932' and by[image]['sha256']==p['image_sha256']
print('Pinned original FS001/FS001_V S2-to-I2 dependencies and exact EOF passed; association with LOCAL fish is authored.')
`,root],{cwd:root,encoding:'utf8',timeout:30000});assert.equal(resourceProof.status,0,resourceProof.stderr||resourceProof.stdout);
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,profile.env,{BLUSTONE_TEAM_LEVEL_PROFILE:'local-linear-100',BLUSTONE_RUPEE_SHOP_MODE:'archive-2021-base-only',BLUSTONE_RUPEE_SHOP_DAILY_LIMIT:'3'});delete process.env.BLUSTONE_STATE_FILE;
  for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_CATALOG_PATH'])process.env[key]=path.resolve(root,profile.env[key]);
  Date.now=()=>1800000000000;
  const loadModule=name=>import(pathToFileURL(path.join(root,'dist/src/'+name+'.js')).href);
  const {createApp}=await loadModule('server'),{gameResponse}=await loadModule('game-routes');
  const {configuredFishingItems}=await loadModule('fishing-item-references'),{configuredFishingCatalogue}=await loadModule('fishing-catalogue'),{configuredFishingCasts}=await loadModule('fishing-casts');
  const parsedItems=configuredFishingItems(items,new Set()),parsedCatalogue=configuredFishingCatalogue(catalogue,new Set(parsedItems.map(row=>row.id)));
  assert.deepEqual(configuredFishingCasts(casts,parsedItems,parsedCatalogue),casts);assert.equal(items[0].id,'LOCAL_PRACTICE_FISH');assert.equal(items[0].thumbnail_id,'FS001');
  assert.deepEqual(casts.contexts.map(c=>[c.place_id,c.cast_dist,c.lure_id]),[1,2,3].map(d=>['PLC001',d,'LU003']));
  assert.equal(casts.on_win,'sell');assert.equal(casts.bait_qty,1);assert.equal(casts.bait_debit,'end-all');assert.equal(casts.stock,'new-stack-per-catch');
  for(const context of casts.contexts){assert.deepEqual(context.outcomes,[{fish_id:items[0].id,grade:1,length:10000},{fish_id:items[0].id,grade:2,length:12000},{fish_id:items[0].id,grade:3,length:15000}]);
    assert.deepEqual(context.tuning,{init_val:30,max_val:100,dec_val:2,inc_val:12,dec_val_on_burn:4,
      first_burn:{min:5,max:7},burn_cool:{min:2,max:4},burn_dur:{min:1,max:2},wait_time:{min:1,max:3}});}
  const baseOptions={baseUrl:'http://localhost',stateFile:file,mirageMode:'local-configured',miragePolicy:mirage,mirageReentryPolicy:reentry,
    rupeeShopMode:'archive-2021-base-only',rupeeShopDailyLimit:3};
  let state=createApp(baseOptions).state;
  const actors=[0,1,2].map(i=>{const data=state.registerGuest({device_id:'fishing-practice-dummy-'+i},{}).ret_data;return {pvid:data.pvid,otp:data.otp};}),actor=actors[0];
  const game=who=>state.gameFor(state.accountFor(who,{}));
  const invoke=(route,payload={},who=actor)=>gameResponse(state,route,{...who,...payload},{});
  const ok=(route,payload={},who=actor)=>{const response=invoke(route,payload,who);assert.equal(response.result_code,1,JSON.stringify(response));return response.ret_data;};
  ok('/shop/BuyGlobalItem',{target_ref_id:'local_rupee_pack',qty:1,price_type:1,item_inst_id:0});assert.equal(read().version,8);
  const afterRupeeGames=structuredClone(read().gameStates),afterRupeeAccounts=structuredClone(read().accounts);
  ok('/mirage/GetInfo');assert.equal(read().version,14);
  for(let i=0;i<3;i++){ok('/mirage/GetNextFloor');ok('/mirage/GetInfo',{reset:'1',stay:'1',entry:'1',inst_base:'1',inst_enemy:'1',ref_stair_list:'1',ref_hero:'1'});}
  const cohort=read();assert.equal(cohort.mirageSeries[0][1].used,3);assert.equal(cohort.mirageRuns[0][1].abandoned,true);
  assert.deepEqual(cohort.gameStates,afterRupeeGames);assert.deepEqual(cohort.accounts,afterRupeeAccounts);
  const oldMirageRuns=structuredClone(cohort.mirageRuns),oldSeries=structuredClone(cohort.mirageSeries),beforeFishing=readFileSync(file);
  const fishOptions={...baseOptions,baitShopMode:'archive-2018-projection',baitShopDailyLimit:3,fishingItems:items,fishingCatalogue:catalogue,
    fishingSaleMode:'local-bound',fishingSaleBindings:bindings,fishingCastMode:'local-configured',fishingCastPolicy:casts};
  state=createApp(fishOptions).state;assert.deepEqual(readFileSync(file),beforeFishing,'Publishing recipes grants no fish/bait and writes no journal');
  assert.equal(game(actor).items.some(i=>i.ref_id==='LU003'&&i.qty>0),false);assert.deepEqual(ok('/fishing/GetInven'),[]);assert.deepEqual(ok('/fishing/GetRecord'),[]);
  assert.deepEqual(ok('/fishing/GetFishingPool'),catalogue.pools);assert.deepEqual(ok('/fishing/GetPriceRef',{fish_id:items[0].id}),catalogue.prices);
  const context=d=>({place_id:'PLC001',cast_dist:String(d),lure_id:'LU003'});
  assert.equal(invoke('/fishing/EndWithSell',{log_id:'-1',is_win:'1'}).result_code,2001);
  assert.deepEqual(readFileSync(file),beforeFishing,'Ordinary practice never accepts the separate tutorial sentinel or fabricates a record');
  assert.equal(invoke('/fishing/Begin',context(2)).result_code,2001);assert.deepEqual(readFileSync(file),beforeFishing,'No supplied bait means no cast or free gift');
  const beforeBuy=structuredClone(game(actor)),purchase=ok('/shop/BuyGlobalItem',{target_ref_id:'LU003',price_type:1,item_inst_id:0,qty:1});
  const baitId=purchase.item[0].inst_id;assert.equal(purchase.item[0].added,10);
  const bought=structuredClone(beforeBuy);bought.gacha_free_qty-=6;bought.next_item_inst_id++;bought.items.push({inst_id:baitId,ref_id:'LU003',qty:10,lock:0});
  assert.deepEqual(game(actor),bought,'Only actual6-Manda payment creates ten bait');
  const boughtAccounts=read().accounts,expectedAccounts=structuredClone(afterRupeeAccounts);
  expectedAccounts.find(a=>a.pvid===actor.pvid).baitShopCounter={day:Math.floor(Date.now()/86400000),buy_cnt:1};assert.deepEqual(boughtAccounts,expectedAccounts);
  const newStackIds=[],sequence=[[2,1,10000,10],[2,2,12000,20],[2,3,15000,30],[1,1,10000,10],[3,1,10000,10]];let earnedGold=0;
  for(const [distance,grade,length,price] of sequence){
    const gameBefore=structuredClone(game(actor)),begin=ok('/fishing/Begin',context(distance));assert.ok(Number.isInteger(begin.log_id)&&begin.log_id>0);
    assert.equal(read().version,15);assert.equal(begin.fish_id,undefined);
    assert.deepEqual(begin,{log_id:begin.log_id,...casts.contexts[distance-1].tuning,achievement:null});assert.deepEqual(game(actor),gameBefore,'Begin reserves but does not debit bait');
    const pending=readFileSync(file);assert.deepEqual(ok('/fishing/Begin',context(distance)),begin);assert.deepEqual(readFileSync(file),pending);
    state=createApp(fishOptions).state;assert.deepEqual(readFileSync(file),pending,'Pending reload retains schema14 Mirage/Rupee state plus cast');
    const caught=ok('/fishing/EndWithSell',{log_id:String(begin.log_id),is_win:'1'}),stack=caught.item[0].inst_id;
    assert.deepEqual({fish_id:caught.fish_id,grade:caught.grade,length:caught.length},{fish_id:items[0].id,grade,length});
    assert.deepEqual(caught.consumed_inst_list,[{inst_id:baitId,qty:1}]);assert.deepEqual(caught.item,[{inst_id:stack,ref_id:items[0].id,added:1}]);
    assert.deepEqual(caught.sell.user.gold,{prev:bought.gold+earnedGold,cur:bought.gold+earnedGold+price});assert.deepEqual(caught.sell.item,[{inst_id:stack,qty:1}]);
    newStackIds.push(stack);earnedGold+=price;assert.deepEqual(ok('/fishing/GetInven'),[{fish_id:items[0].id,b_cnt:0,s_cnt:0,g_cnt:0}]);
    const settled=readFileSync(file);assert.equal(invoke('/fishing/EndWithSell',{log_id:String(begin.log_id),is_win:'1'}).result_code,10203);
    assert.deepEqual(readFileSync(file),settled,'No second additive catch/sale receipt is replayed');
    assert.deepEqual(read().mirageRuns,oldMirageRuns);assert.deepEqual(read().mirageSeries,oldSeries);assert.deepEqual(read().accounts,expectedAccounts);
  }
  assert.equal(earnedGold,80);assert.equal(new Set(newStackIds).size,5);assert.deepEqual(newStackIds,Array.from({length:5},(_,i)=>bought.next_item_inst_id+i));
  const lossBegin=ok('/fishing/Begin',context(1));assert.ok(lossBegin.log_id>0);
  const loss=ok('/fishing/EndWithSell',{log_id:String(lossBegin.log_id),is_win:'0'});
  assert.deepEqual(loss,{fish_id:'',grade:0,length:0,consumed_inst_list:[{inst_id:baitId,qty:1}],achievement:null});
  const expected=structuredClone(bought);expected.gold+=80;expected.next_item_inst_id+=5;expected.items.find(i=>i.inst_id===baitId).qty=4;
  expected.items.push(...newStackIds.map(inst_id=>({inst_id,ref_id:items[0].id,qty:0,lock:0})));expected.owned_fish=[{fish_id:items[0].id,b_cnt:0,s_cnt:0,g_cnt:0}];
  assert.deepEqual(game(actor),expected,'Only six bait debits, five sold tombstones, allocator and configured80gold change the actual buyer game');
  for(const who of actors.slice(1))assert.deepEqual(game(who),afterRupeeGames.find(([id])=>id===who.pvid)[1]);
  assert.deepEqual(ok('/fishing/GetRecord'),[{fish_id:items[0].id,grade:3,length:15000}]);
  const final=readFileSync(file),offOptions={...fishOptions,fishingCastMode:'disabled',fishingSaleMode:'disabled'};delete offOptions.fishingCastPolicy;
  state=createApp(offOptions).state;assert.deepEqual(readFileSync(file),final);assert.deepEqual(ok('/fishing/GetRecord'),[{fish_id:items[0].id,grade:3,length:15000}]);
  assert.equal(invoke('/fishing/Begin',context(2)).result_code,2001);assert.deepEqual(readFileSync(file),final);
  assert.equal(read().version,15);assert.deepEqual(read().mirageRuns,oldMirageRuns);assert.deepEqual(read().mirageSeries,oldSeries);assert.deepEqual(read().accounts,expectedAccounts);
  for(let i=0;i<recipeFiles.length;i++)assert.deepEqual(readFileSync(path.join(root,recipeFiles[i])),recipeBytes[i]);assert.deepEqual(readFileSync(profileFile),profileBytes);
  console.log('LOCAL ordinary practice fishing: native PLC001+distance selectors, pinned FS001/FS001_V, authored30/12/burn5..7, compiled170 real6-Manda/10bait, Mirage14/Rupee -> Fishing15, positive-log outcomes/sale/loss/retention passed. Tutorial log-1 refuses; native tutorial gate remains pending; no activation/native claim.');
}finally{
  Date.now=realNow;for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];Object.assign(process.env,savedEnv);rmSync(dir,{recursive:true,force:true});
}
