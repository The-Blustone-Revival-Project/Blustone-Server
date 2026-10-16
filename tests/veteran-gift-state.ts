import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-veteran-gift-")),realNow=Date.now;
let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),options={veteranGiftMode:"local-points" as const,veteranPointsPerTicket:25};
  const state=new ServerState("http://localhost",file,options);
  const sender=state.registerGuest({device_id:"gift-sender"},{}).ret_data as any;
  const target=state.registerGuest({device_id:"gift-recipient"},{}).ret_data as any;
  const stranger=state.registerGuest({device_id:"gift-other-server"},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
  const from=games.get(sender.pvid),to=games.get(target.pvid),wide="9007199254740993";
  // Authored owned certificate fixture, not a claimed jackpot/reward producer.
  from.items=[{inst_id:wide,ref_id:"GC6",qty:3,lock:0},{inst_id:17,ref_id:"unrelated",qty:4,lock:1}];
  to.items=[{inst_id:wide,ref_id:"GC6",qty:7,lock:0}];
  from.vip_exp=90;to.vip_exp=10;from.ap=1;from.bp=1;from.ap_updated_at=now;from.bp_updated_at=now;
  accounts.get(stranger.pvid).serverId=accounts.get(sender.pvid).serverId+1;(state as any).persist();
  const gift=(extra={},s=state,who=sender)=>gameResponse(s,"/world/UseVIPTicket",{...who,inst_id:wide,target_pvid:target.pvid,qty:1,...extra}) as any;
  const refs=state.itemReferenceRows().item;assert.equal(refs.filter(row=>row.id==="GC6").length,1);
  assert.equal(refs.find(row=>row.id==="GC6")!.use_type,0,"Neutral local metadata is not an original item definition");
  assert.throws(()=>gameResponse(state,"/world/UseVIPTicket",{inst_id:wide,target_pvid:target.pvid,qty:1}),/authenticated account required/);
  const snapshot=()=>{
    const refs:{root:any;path:string[];ref:any}[]=[];
    const walk=(root:any,ref:any,keys:string[]=[])=>{if(!ref||typeof ref!=="object")return;refs.push({root,path:keys,ref});for(const [key,value] of Object.entries(ref))walk(root,value,[...keys,key]);};
    [...games.values(),...accounts.values()].forEach(value=>walk(value,value));
    return {bytes:readFileSync(file),g:structuredClone([...games]),a:structuredClone([...accounts]),refs};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.g);assert.deepEqual([...accounts],before.a);
    before.refs.forEach(({root,path,ref})=>assert.equal(path.reduce((value,key)=>value[key],root),ref));
  };
  now+=3_600_000;
  const initial=snapshot();
  for(const extra of [{target_pvid:sender.pvid},{target_pvid:stranger.pvid},{target_pvid:9_000_001},{target_pvid:"02"},
    {target_pvid:true},{qty:0},{qty:4},{inst_id:17},{inst_id:"9007199254740994"}]){
    assert.notEqual(gift(extra).result_code,1);unchanged(initial);
  }
  const block=(who:any,other:number,name:string)=>gameResponse(state,"/relation/"+name,{...who,target_list:JSON.stringify([other])});
  for(const [who,other] of [[sender,target.pvid],[target,sender.pvid]]){
    assert.equal(block(who,other,"Block").result_code,1);const before=snapshot();assert.notEqual(gift().result_code,1);unchanged(before);
    assert.equal(block(who,other,"Unblock").result_code,1);
  }
  assert.throws(()=>gift({pvid:target.pvid}),/does not match|authenticated/);
  const senderSnapshot=games.get(sender.pvid);games.delete(sender.pvid);const noSender=snapshot();
  assert.notEqual(gift().result_code,1);unchanged(noSender);assert.equal(games.has(sender.pvid),false);games.set(sender.pvid,senderSnapshot);
  const missing=games.get(target.pvid);games.delete(target.pvid);const absent=snapshot();
  assert.notEqual(gift().result_code,1);unchanged(absent);assert.equal(games.has(target.pvid),false);games.set(target.pvid,missing);
  const failWrites=()=>{
    const before=snapshot();mkdirSync(file+".tmp");
    try{assert.throws(()=>gift(),/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}unchanged(before);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>gift(),/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}unchanged(before);
  };
  failWrites();const first=gift({vip_exp:999999,pointsPerTicket:999999});assert.equal(first.result_code,1);
  assert.deepEqual(Object.keys(first.ret_data),["consumed_item_list"]);
  assert.match(JSON.stringify(first.ret_data),/"inst_id":9007199254740993,"qty":1/);
  assert.equal(from.items[0].qty,2);assert.equal(to.vip_exp,35);assert.equal(from.vip_exp,90);assert.equal(to.items[0].qty,7);
  assert.equal(from.ap,1);assert.equal(from.bp,1);assert.equal(from.ap_updated_at,initial.g[0][1].ap_updated_at);
  failWrites();assert.equal(gift({qty:2}).result_code,1);assert.equal(from.items[0].qty,0);assert.equal(to.vip_exp,85);
  const depleted=snapshot();assert.notEqual(gift().result_code,1);unchanged(depleted);
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,1,"Gift uses existing fields and adds no fabricated history schema");
  const bytes=readFileSync(file),restart=new ServerState("http://localhost",file,options);
  assert.deepEqual([...(restart as any).gameByPvid],[...games]);assert.deepEqual(readFileSync(file),bytes);
  const detail=gameResponse(restart,"/world/GetUserDetail",{...sender,list:JSON.stringify([target.pvid])}).ret_data as any[];
  assert.equal(detail[0].vip_exp,85);assert.deepEqual(readFileSync(file),bytes);
  const disabled=new ServerState("http://localhost",file);assert.notEqual(gift({},disabled).result_code,1);assert.deepEqual(readFileSync(file),bytes);
  assert.equal(disabled.itemReferenceRows().item.some(row=>row.id==="GC6"),false);
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
console.log("Local Veteran gift: real-account owner/recipient separation, full64 removal delta, configured recipient-only points, mutual blocks/cross-server/self refusal, real write/rename rollback, clocks/no allocation, restart and disabled preservation passed.");
