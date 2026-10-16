import type {ProfileEditView} from "./profile-settings.js";
const html=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
const json=(value:unknown)=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,char=>`\\u${char.charCodeAt(0).toString(16).padStart(4,"0")}`);
/** Local page, using the original Android bridge only to deliver the native
 * close callback. Server-authenticated persistence is the caller's boundary. */
export function renderProfilePage(view:ProfileEditView,webToken:string):string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edit Profile</title>
<style>body{margin:0;background:#172532;color:#f5f2e7;font:17px system-ui,sans-serif}main{max-width:440px;margin:auto;padding:24px}h1{font-size:26px}label{display:block;margin:24px 0 8px}input,textarea,button{box-sizing:border-box;width:100%;font:inherit;border-radius:8px;padding:12px}input,textarea{color:#172532;border:1px solid #81929c}textarea{min-height:100px;resize:vertical}small{display:block;margin:6px 0;color:#c4d3db}button{margin-top:16px;border:0;background:#f3c567;color:#172532;font-weight:600}button:disabled{opacity:.5}#close{background:#344b5b;color:#fff}#message{min-height:24px}</style></head>
<body><main><h1>Edit Profile</h1><label for="nickname">Nickname</label><input id="nickname" value="${html(view.nick_name)}" autocomplete="off"><small id="price">${view.rename_price===0?"First nickname change is free.":"Nickname change: 100 Manda."}</small>
<label for="status">Status message</label><textarea id="status">${html(view.info_message)}</textarea><small id="count"></small><p>Manda: <span id="balance">${html(String(view.manda))}</span></p><p id="message" role="status" aria-live="polite"></p><button id="save" type="button">Save changes</button><button id="close" type="button">Close</button></main>
<script>(function(){'use strict';var token=${json(webToken)},view=${json(view)},busy=false;
var nickname=document.getElementById('nickname'),status=document.getElementById('status'),save=document.getElementById('save'),message=document.getElementById('message');
function update(){var n=Array.from(status.value).length;document.getElementById('count').textContent=n+' / 50 characters';save.disabled=busy||n>50||Array.from(nickname.value).length>128||nickname.value.trim().length===0;}
function show(v){view=v;nickname.value=v.nick_name;status.value=v.info_message;document.getElementById('balance').textContent=String(v.manda);document.getElementById('price').textContent=v.rename_price===0?'First nickname change is free.':'Nickname change: 100 Manda.';update();}
nickname.addEventListener('input',update);status.addEventListener('input',update);
save.addEventListener('click',function(){if(save.disabled)return;busy=true;update();message.textContent='Saving…';var request=new XMLHttpRequest();request.open('POST','/webview/my-info/update',true);request.setRequestHeader('Content-Type','application/json');request.timeout=15000;
function failed(){busy=false;update();message.textContent='Unable to save changes. Please try again.';}
request.onerror=failed;request.ontimeout=failed;request.onload=function(){busy=false;try{var response=JSON.parse(request.responseText);if(request.status!==200||response.result_code!==1)throw new Error();show(response.ret_data);message.textContent='Changes saved.';}catch(error){failed();}};
request.send(JSON.stringify({web_token:token,patch:{nick_name:nickname.value,info_message:status.value}}));});
document.getElementById('close').addEventListener('click',function(){if(busy)return;var bridge=window.VSWebViewBridge;if(bridge&&typeof bridge.SetData==='function'&&typeof bridge.CloseView==='function'){bridge.SetData(JSON.stringify({result_code:1,action_type:0,ret_data:{}}));bridge.CloseView();}else{message.textContent='Saved. You can close this page.';}});update();})();</script></body></html>`;
}
