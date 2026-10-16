import assert from "node:assert/strict";
import vm from "node:vm";
import {normalizeProfileSettings,planProfileSettings,profileEditView,validateProfileNickname} from "../src/profile-settings.js";
import {renderProfilePage} from "../src/profile-page.js";

const U32=0xffff_ffff;
const empty=planProfileSettings("Captain",undefined,50,60,{});
assert.deepEqual(empty,{nickname:"Captain",settings:undefined,gacha_free_qty:50,gacha_iap_qty:60,changed:false});
assert.deepEqual(planProfileSettings("Captain",undefined,50,60,{info_message:"",nick_name:"Captain"}),empty);
assert.equal(validateProfileNickname("  Captain  "),"  Captain  ");
assert.equal(planProfileSettings("old".repeat(50),undefined,0,0,{nick_name:"Repaired"}).nickname,"Repaired");
assert.equal(planProfileSettings("old\ninvalid",undefined,0,0,{nick_name:"Repaired"}).settings!.rename_count,1);
assert.throws(()=>planProfileSettings("old\ninvalid",undefined,0,0,{info_message:"okay"}));
const status=planProfileSettings("Captain",undefined,50,60,{info_message:"Hello!"});
assert.deepEqual(status.settings,{info_message:"Hello!",rename_count:0});assert.equal(status.gacha_free_qty,50);
const first=planProfileSettings("Captain",status.settings,50,60,{nick_name:"  New Captain  "});
assert.equal(first.nickname,"  New Captain  ");assert.equal(first.settings!.rename_count,1);assert.equal(first.gacha_free_qty,50);
assert.equal(first.settings!.info_message,"Hello!");
const next=planProfileSettings(first.nickname,first.settings,50,60,{nick_name:"  new Captain  ",info_message:""});
assert.equal(next.settings!.rename_count,2);assert.equal(next.gacha_free_qty,0);assert.equal(next.gacha_iap_qty,10);
assert.equal(next.nickname,"  new Captain  ","No case/space normalization");
assert.deepEqual(first.settings,{info_message:"Hello!",rename_count:1});
assert.throws(()=>planProfileSettings("Captain",first.settings,99,0,{nick_name:"Other"}),/Manda/);
const noNameFee=planProfileSettings("Captain",first.settings,0,0,{info_message:"changed"});
assert.equal(noNameFee.settings!.rename_count,1);assert.equal(noNameFee.gacha_iap_qty,0);
const same=planProfileSettings("Captain",first.settings,0,0,{nick_name:"Captain",info_message:"Hello!"});
assert.equal(same.changed,false);assert.notEqual(same.settings,first.settings);same.settings!.info_message="mutated";
assert.equal(first.settings!.info_message,"Hello!");
assert.equal(planProfileSettings("Captain",undefined,0,0,{nick_name:"🌟".repeat(128)}).nickname.length,256);
assert.equal(planProfileSettings("Captain",undefined,0,0,{info_message:"🌟".repeat(50)}).settings!.info_message.length,100);
for(const patch of [null,[],"{}",{rename_count:0},{price:0},{nickname:"x"},{nick_name:null},{info_message:1},
  {nick_name:""},{nick_name:" \t"},{nick_name:"a".repeat(129)},{info_message:"🌟".repeat(51)},
  {info_message:"line\nnext"},{nick_name:"a\0b"},{nick_name:"\ud800"},{info_message:"\udfff"}])
  assert.throws(()=>planProfileSettings("Captain",undefined,50,60,patch));
for(const value of [-1,1.5,U32+1,NaN,Infinity]) {
  assert.throws(()=>planProfileSettings("Captain",undefined,value,0,{}));
  assert.throws(()=>profileEditView("Captain",undefined,0,value));
}
for(const raw of [null,undefined,{},[],{info_message:"",rename_count:-1},{info_message:"",rename_count:U32+1},
  {info_message:"",rename_count:"0"},{info_message:"",rename_count:0,extra:1},{info_message:"\n",rename_count:0}])
  assert.throws(()=>normalizeProfileSettings(raw));
const capped={info_message:"",rename_count:U32};
assert.throws(()=>planProfileSettings("Captain",capped,U32,U32,{nick_name:"Changed"}),/capacity/);
assert.equal(planProfileSettings("Captain",capped,0,0,{info_message:"okay"}).settings!.rename_count,U32);
assert.deepEqual(profileEditView("Captain",undefined,40,60),{nick_name:"Captain",info_message:"",rename_price:0,manda:100});
assert.equal(profileEditView("Captain",status.settings,0,0).rename_price,0);
assert.equal(profileEditView("Captain",first.settings,0,100).rename_price,100);
const hostile='</script><img src=x onerror="bad()">\u2028&';
const page=renderProfilePage({nick_name:hostile,info_message:hostile,rename_price:100,manda:110},hostile);
assert.equal((page.match(/<script>/g)||[]).length,1);assert.equal((page.match(/<\/script>/g)||[]).length,1);
assert.ok(page.includes('&lt;/script&gt;'));assert.ok(page.includes('\\u003c/script\\u003e'));
assert.equal(page.includes(hostile),false);assert.ok(page.includes('name="viewport"'));
assert.ok(!/<script[^>]+src=|https?:\/\//.test(page));
const script=page.match(/<script>([\s\S]*)<\/script>/)![1];
const elements=new Map<string,any>();
for(const id of ['nickname','status','save','message','count','balance','price','close'])
  elements.set(id,{value:id==='nickname'?'Captain':id==='status'?'Hello':'',textContent:'',disabled:false,
    listeners:{} as Record<string,()=>void>,addEventListener(event:string,fn:()=>void){this.listeners[event]=fn;}});
let request:any;const calls:any[]=[];
class FakeRequest {
  status=200;responseText='';onload?:()=>void;
  constructor(){request=this;}
  open(...args:any[]){calls.push(['open',...args]);}
  setRequestHeader(...args:any[]){calls.push(['header',...args]);}
  send(body:string){calls.push(['send',JSON.parse(body)]);}
}
const window:any={VSWebViewBridge:{SetData:(raw:string)=>calls.push(['SetData',JSON.parse(raw)]),CloseView:()=>calls.push(['CloseView'])}};
vm.runInNewContext(script,{document:{getElementById:(id:string)=>elements.get(id)},window,XMLHttpRequest:FakeRequest});
elements.get('save').listeners.click();
assert.deepEqual(calls[0],['open','POST','/webview/my-info/update',true]);
assert.deepEqual(calls[1],['header','Content-Type','application/json']);
assert.deepEqual(calls[2],['send',{web_token:hostile,patch:{nick_name:'Captain',info_message:'Hello'}}]);
elements.get('close').listeners.click();assert.equal(calls.length,3,'Cannot close while save is pending');
request.responseText=JSON.stringify({result_code:1,ret_data:{nick_name:'Saved',info_message:'New',rename_price:100,manda:10}});request.onload();
assert.equal(elements.get('nickname').value,'Saved');assert.equal(elements.get('balance').textContent,'10');
assert.equal(elements.get('message').textContent,'Changes saved.');
elements.get('close').listeners.click();assert.deepEqual(calls.slice(-2),[['SetData',{result_code:1,action_type:0,ret_data:{}}],['CloseView']]);
delete window.VSWebViewBridge;elements.get('close').listeners.click();assert.match(elements.get('message').textContent,/close this page/);
elements.get('status').value='🌟'.repeat(51);elements.get('status').listeners.input();assert.equal(elements.get('save').disabled,true);
elements.get('status').value='🌟'.repeat(50);elements.get('status').listeners.input();assert.equal(elements.get('save').disabled,false);
console.log("Profile settings: strict lossless codepoint text, historical free/100 quote, LOCAL free-first, no-op/counter/refusal/detachment, escaped mobile page and actual JavaScript POST/bridge flow passed.");
