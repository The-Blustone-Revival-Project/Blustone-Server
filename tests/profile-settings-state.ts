import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-profile-settings-")),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  const file=path.join(directory,"state.json"),seed=new ServerState("http://localhost",file);
  const actor=seed.registerGuest({device_id:"profile-owner",nickname:"Initial",extra_data:{profileSettings:{info_message:"injected",rename_count:0}}},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"profile-peer",nickname:"Peer"},{}).ret_data as any;
  assert.equal((seed as any).accountsByPvid.get(actor.pvid).profileSettings,undefined);
  assert.throws(()=>seed.webLoginToken({},{}),/authenticated account required/);
  const findUrls=(value:any):any[]=>!value||typeof value!=="object"?[]:
    [...(value.url_key==="my_info"?[value]:[]),...Object.values(value).flatMap(findUrls)];
  assert.deepEqual(findUrls(seed.baseInfo()),[]);assert.deepEqual(findUrls(seed.accountSnapshot(seed.accountFor(actor,{}))),[]);
  const reward={...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]};
  const ref=(id:string,type:number)=>({id,type,target_val:1,serial:1,title:"LOCAL profile coexistence",desc:"Earn %t",desc_noti:"",npc_id:"",go_to:"",option_val:0,reward});
  const daily=ref("local_profile_daily",2),linear=ref("local_profile_linear",3);
  const questPolicy={period_id:"profile-period",minimum_stage:"n_01_01",references:[daily],rules:[{id:daily.id,event:"mission-win",stage_id:null}],
    owners:{[actor.pvid]:[{daily_quest_id:daily.id,is_rewarded:0,cur_val:0}]},linear:{references:[linear],rules:[{id:linear.id,event:"mission-win",stage_id:"n_01_01"}]}};
  const options={profileMode:"archive-profile-projection" as const,baitShopMode:"archive-2018-projection" as const,baitShopDailyLimit:2,
    questMode:"local-fixed" as const,questPolicy};
  const state=new ServerState("http://localhost",file,options),games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
  const account=accounts.get(actor.pvid),game=games.get(actor.pvid),nativeAuth={pvid:actor.pvid,otp:actor.otp};
  const call=(who:any,route:string,extra={})=>gameResponse(state,route,{...who,...extra}) as any;
  const acquired=state.webLoginToken(actor,{}) as any,token=acquired.ret_data.token;
  assert.equal(token,account.webToken);assert.notEqual(token,account.otp);
  assert.equal((state.webLoginToken(peer,{}) as any).ret_data.token,accounts.get(peer.pvid).webToken);
  const urls=findUrls(state.baseInfo());assert.equal(urls.length,1);
  assert.equal(urls[0].address,"http://localhost/webview/my-info");assert.equal((urls[0].param_format.match(/%s/g)||[]).length,3);
  assert.deepEqual(findUrls(state.accountSnapshot(account)),urls);
  const unusedEditorRead=(version:number)=>{
    const bytes=readFileSync(file);assert.equal(JSON.parse(bytes.toString()).version,version);
    state.webProfile(token);state.updateWebProfile(token,{});assert.deepEqual(readFileSync(file),bytes);
  };
  assert.equal(call(actor,"/dailyquest/GetRefList").result_code,1);unusedEditorRead(4);
  assert.equal(call(actor,"/arena/SaveComment",{comment_info:'{"win_message":"Profile preserved"}'}).result_code,1);
  unusedEditorRead(5);
  // Explicit inactive dispatch fixture verifies its separate journal survives
  // later schemas; wallets are authored only in these disposable accounts.
  (state as any).dispatches.set(actor.pvid,{active:null,last_id:"0",last_deck:[]});
  game.gacha_free_qty=60;game.gacha_iap_qty=150;(state as any).persist();
  assert.equal(call(actor,"/shop/BuyGlobalItem",{target_ref_id:"LU003",price_type:1,item_inst_id:0,qty:1}).result_code,1);
  unusedEditorRead(6);
  const snapshot=()=>{
    const refs:Array<{root:any;keys:string[];value:any}>=[];
    const walk=(root:any,value:any,keys:string[]=[])=>{if(value===null||typeof value!=="object")return;refs.push({root,keys,value});for(const [k,v]of Object.entries(value))walk(root,v,[...keys,k]);};
    for(const value of [...games.values(),...accounts.values()])walk(value,value);
    return {bytes:readFileSync(file),value:structuredClone({games:[...games],accounts:[...accounts],quests:[...(state as any).quests],dispatches:[...(state as any).dispatches]}),refs};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual({games:[...games],accounts:[...accounts],quests:[...(state as any).quests],dispatches:[...(state as any).dispatches]},before.value);
    for(const {root,keys,value}of before.refs)assert.equal(keys.reduce((v,k)=>v[k],root),value,keys.join("."));
  };
  const failedWrites=(operation:()=>unknown)=>{
    const before=snapshot();mkdirSync(file+".tmp");try{assert.throws(operation,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}unchanged(before);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(operation,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}unchanged(before);
  };
  const untouched=snapshot();assert.equal(state.webProfile(token).nick_name,"Initial");unchanged(untouched);
  for(const raw of [undefined,"","wrong",account.otp,actor.vs_token])assert.throws(()=>state.webProfile(raw),/token|session/);
  assert.throws(()=>state.updateWebProfile("wrong",{}),/token|session/);unchanged(untouched);
  assert.throws(()=>state.webLoginToken({...actor,pvid:peer.pvid},{}),/identity|account|PVID|pvid/i);unchanged(untouched);
  const edit=(patch:unknown)=>state.updateWebProfile(token,patch) as any;
  assert.equal(edit({}).result_code,1);assert.equal(edit({nick_name:"Initial",info_message:""}).result_code,1);unchanged(untouched);
  for(const patch of [{info_message:"🌟".repeat(51)},{info_message:"bad\nline"},{info_message:"\ud800"},{nick_name:""},{rename_count:0},{pvid:peer.pvid},{web_token:accounts.get(peer.pvid).webToken},{price:0}]){assert.notEqual(edit(patch).result_code,1);unchanged(untouched);}
  failedWrites(()=>state.confirmNickname({...nativeAuth,nick_name:"Native renamed"},{}));
  assert.deepEqual(state.confirmNickname({...nativeAuth,nickname:"Native renamed"},{}).ret_data,{nick_name:"Native renamed"});
  const confirmed=snapshot();assert.deepEqual(state.confirmNickname({...nativeAuth,nick_name:"Native renamed"},{}).ret_data,{nick_name:"Native renamed"});unchanged(confirmed);
  const status="🌟".repeat(50);failedWrites(()=>edit({info_message:status}));
  assert.equal(edit({info_message:status}).result_code,1);assert.deepEqual(account.profileSettings,{info_message:status,rename_count:0});
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,7);
  assert.equal(edit({nick_name:"Captain 🌟"}).result_code,1);assert.equal(account.profileSettings.rename_count,1);assert.equal(game.gacha_free_qty,54);assert.equal(game.gacha_iap_qty,150);
  const beforePaid=snapshot();failedWrites(()=>edit({nick_name:"Second 🌟"}));unchanged(beforePaid);
  assert.equal(edit({nick_name:"Second 🌟"}).result_code,1);assert.equal(game.gacha_free_qty,0);assert.equal(game.gacha_iap_qty,104);assert.equal(account.profileSettings.rename_count,2);
  assert.equal(account.profileSettings.info_message,status);assert.equal(accounts.get(peer.pvid).profileSettings,undefined);
  const settled=snapshot();assert.equal(state.confirmNickname({...nativeAuth,nick_name:"Bypass fee"},{}).result_code,2001);
  assert.deepEqual(state.confirmNickname({...nativeAuth,nick_name:account.nickname},{}).ret_data,{nick_name:account.nickname});assert.equal(edit({}).result_code,1);assert.equal(edit({nick_name:account.nickname,info_message:status}).result_code,1);unchanged(settled);
  game.gacha_iap_qty=99;(state as any).persist();const poor=snapshot();assert.notEqual(edit({nick_name:"Cannot afford"}).result_code,1);unchanged(poor);game.gacha_iap_qty=104;(state as any).persist();
  assert.equal(state.accountSnapshot(account).profile_status,status);assert.equal(state.accountSnapshot(account).nick_name,"Second 🌟");
  const brief=(who:any)=>call(who,"/relation/GetTargetUserInfo",{list:JSON.stringify([actor.pvid])}).ret_data.list[0];
  assert.equal(brief(actor).profile_status,status);assert.equal(brief(peer).profile_status,status);assert.equal(brief(peer).nick_name,"Second 🌟");
  const found=call(peer,"/relation/FriendSearch",{target_nick_name:"Second",start:0,end:10}).ret_data.list.find((r:any)=>r.target_pvid===actor.pvid);
  assert.equal(found.profile_status,status);assert.equal(found.nick_name,"Second 🌟");
  const requested=call(peer,"/relation/FriendRequest",{target_pvid:actor.pvid});assert.equal(requested.result_code,1);
  assert.equal(call(actor,"/relation/FriendReqAccept",{target_friend_id:requested.ret_data.friend_id}).result_code,1);
  assert.equal(call(peer,"/relation/GetList",{type:1}).ret_data.list.find((r:any)=>r.target_pvid===actor.pvid).profile_status,status);
  const renameCount=account.profileSettings.rename_count,paid=game.gacha_iap_qty;
  assert.equal(edit({info_message:""}).result_code,1);assert.equal(state.profileStatus(actor.pvid),"");
  assert.equal(account.profileSettings.rename_count,renameCount);assert.equal(game.gacha_iap_qty,paid);
  assert.equal(edit({info_message:status}).result_code,1);
  const bytes=readFileSync(file),restart=new ServerState("http://localhost",file,options),saved=JSON.parse(bytes.toString());
  assert.deepEqual((restart as any).accountsByPvid.get(actor.pvid).profileSettings,account.profileSettings);assert.deepEqual((restart as any).gameByPvid.get(actor.pvid),game);assert.deepEqual(readFileSync(file),bytes);
  assert.equal(restart.webProfile(token).info_message,status);assert.equal(restart.webProfile(token).rename_price,100);
  assert.equal(saved.version,7);assert.equal(saved.dispatches.length,1);assert.ok(saved.quests[0][1].linear);assert.equal(saved.accounts.find((a:any)=>a.pvid===actor.pvid).baitShopCounter.buy_cnt,1);assert.equal(saved.accounts.find((a:any)=>a.pvid===actor.pvid).arenaComments.win_message,"Profile preserved");
  const off=new ServerState("http://localhost",file,{profileMode:"disabled"});assert.throws(()=>off.webProfile(token),/disabled/);assert.deepEqual(readFileSync(file),bytes);
  const badFile=path.join(directory,"bad.json");
  for(const mutate of [
    ...[1,2,3,4,5,6].map(version=>(v:any)=>{v.version=version;}),
    (v:any)=>{v.accounts.forEach((a:any)=>delete a.profileSettings);},(v:any)=>{delete v.dispatches;},(v:any)=>{delete v.quests;},
    (v:any)=>{v.accounts.find((a:any)=>a.pvid===actor.pvid).profileSettings.info_message="a".repeat(51);},
  ]){const value=structuredClone(saved);mutate(value);writeFileSync(badFile,JSON.stringify(value));const prior=readFileSync(badFile);assert.throws(()=>new ServerState("http://localhost",badFile,options));assert.deepEqual(readFileSync(badFile),prior);}
  const freshFile=path.join(directory,"fresh.json"),fresh=new ServerState("http://localhost",freshFile,{profileMode:"archive-profile-projection"});
  const unused=fresh.registerGuest({device_id:"unused-editor"},{}).ret_data as any,initial=readFileSync(freshFile);
  const unusedToken=(fresh.webLoginToken(unused,{}) as any).ret_data.token;fresh.webProfile(unusedToken);fresh.updateWebProfile(unusedToken,{});
  assert.equal(JSON.parse(initial.toString()).version,1);assert.deepEqual(readFileSync(freshFile),initial);
  // Valid earlier journal schemas remain byte-identical when the editor is
  // merely enabled/read. These are detached authored snapshot fixtures.
  for(const version of [2,3]){
    const value=JSON.parse(initial.toString());value.version=version;
    value.dispatches=[[unused.pvid,{active:null,last_id:"0",last_deck:[]}]];
    if(version===3){const journal=structuredClone(saved.quests[0][1]);delete journal.linear;value.quests=[[unused.pvid,journal]];}
    const legacyFile=path.join(directory,`legacy-${version}.json`);writeFileSync(legacyFile,JSON.stringify(value));const bytes=readFileSync(legacyFile);
    const legacy=new ServerState("http://localhost",legacyFile,{profileMode:"archive-profile-projection"});
    const t=(legacy.webLoginToken(unused,{}) as any).ret_data.token;legacy.webProfile(t);legacy.updateWebProfile(t,{});
    assert.deepEqual(readFileSync(legacyFile),bytes);
  }
  const freshGame=(fresh as any).gameByPvid.get(unused.pvid);(fresh as any).gameByPvid.delete(unused.pvid);
  assert.throws(()=>fresh.webProfile(unusedToken),/snapshot/);assert.notEqual(fresh.updateWebProfile(unusedToken,{}).result_code,1);assert.equal((fresh as any).gameByPvid.has(unused.pvid),false);(fresh as any).gameByPvid.set(unused.pvid,freshGame);
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
console.log("Profile state: exact token/URLs, authenticated readonly ownership, Unicode/status propagation, free/paid rename and ConfirmNickname, real write/rename atomicity, no-ops, schema7 coexistence/refusals and restart passed.");

