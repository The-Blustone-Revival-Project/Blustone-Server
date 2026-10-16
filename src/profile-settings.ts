export interface ProfileSettings {info_message:string;rename_count:number}
export interface ProfileEditView {nick_name:string;info_message:string;rename_price:0|100;manda:number}
const U32=0xffff_ffff;
function text(value:unknown,max:number,nonblank=false):string {
  if(typeof value!=="string"||Buffer.from(value,"utf8").toString("utf8")!==value||/[\u0000-\u001f]/.test(value)||
    Array.from(value).length>max||(nonblank&&value.trim().length===0))throw new TypeError("Invalid profile text");
  return value;
}
function wallet(free:number,paid:number) {
  if([free,paid].some(value=>!Number.isInteger(value)||value<0||value>U32))throw new TypeError("Invalid profile wallet");
}
export function validateProfileNickname(raw:unknown):string {return text(raw,128,true);}
export function normalizeProfileSettings(raw:unknown):ProfileSettings {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).sort().join(",")!=="info_message,rename_count")
    throw new TypeError("Malformed profile settings");
  const row=raw as ProfileSettings;
  if(!Number.isInteger(row.rename_count)||row.rename_count<0||row.rename_count>U32)throw new TypeError("Invalid rename count");
  return {info_message:text(row.info_message,50),rename_count:row.rename_count};
}
/** LOCAL nickname admission is128 codepoints, lossless UTF8 and nonblank.
 * The single undated original profile image gives status50 and first rename
 * free, later100Manda. Uniqueness and original nickname limits are unknown. */
export function planProfileSettings(currentNickname:string,settings:ProfileSettings|undefined,free:number,paid:number,patch:unknown) {
  wallet(free,paid);
  const prior=settings===undefined?undefined:normalizeProfileSettings(settings);
  if(!patch||typeof patch!=="object"||Array.isArray(patch)||Object.keys(patch).some(key=>key!=="nick_name"&&key!=="info_message"))
    throw new TypeError("Unsupported profile patch");
  const values=patch as Record<string,unknown>;
  // An explicit valid replacement can repair a legacy name outside LOCAL
  // admission. The legacy value is then only used for exact comparison.
  const nickname=Object.hasOwn(values,"nick_name")?validateProfileNickname(values.nick_name):validateProfileNickname(currentNickname);
  const info=Object.hasOwn(values,"info_message")?text(values.info_message,50):prior?.info_message??"";
  const renamed=nickname!==currentNickname,changed=renamed||info!==(prior?.info_message??"");
  if(!changed)return {nickname:currentNickname,settings:prior,gacha_free_qty:free,gacha_iap_qty:paid,changed:false};
  let count=prior?.rename_count??0;
  const fee=renamed&&count>0?100:0;
  if(renamed&&count===U32)throw new TypeError("Rename counter capacity reached");
  if(free+paid<fee)throw new TypeError("Insufficient Manda for nickname change");
  const fromFree=Math.min(free,fee); // Explicit LOCAL spending order.
  if(renamed)count++;
  return {nickname,settings:{info_message:info,rename_count:count},gacha_free_qty:free-fromFree,
    gacha_iap_qty:paid-(fee-fromFree),changed:true};
}
export function profileEditView(nickname:string,settings:ProfileSettings|undefined,free:number,paid:number):ProfileEditView {
  validateProfileNickname(nickname);wallet(free,paid);
  const prior=settings===undefined?undefined:normalizeProfileSettings(settings);
  return {nick_name:nickname,info_message:prior?.info_message??"",rename_price:prior&&prior.rename_count>0?100:0,manda:free+paid};
}
