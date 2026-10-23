import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-mail-atomic-")),realNow=Date.now;
const epoch=Date.parse("2026-10-23T12:00:00Z");Date.now=()=>epoch;
function fixture(name:string) {
  const file=path.join(dir,name+".json"),state=new ServerState("http://localhost",file);
  const owners=Array.from({length:3},(_,i)=>{
    const row=state.registerGuest({device_id:`${name}-${i}`},{}).ret_data as any;return {pvid:row.pvid,otp:row.otp};
  });
  const auth=owners[0],game=(state as any).gameByPvid.get(auth.pvid);
  // Authored disposable mailbox history, with no attachment or native delivery
  // assertion. ID1 is an old known deletion;2/3 are actual owned fixture rows.
  game.mail={next_id:4,victory_notice_sent:true,received:[2,3].map(id=>({id,content:`Disposable local test message ${id}; no attachment.`,
    created_datetime:Math.floor(epoch/1000),is_read:0,is_archived:0})),deleted:[1]};
  game.ap=10;game.bp=2;game.ap_updated_at=epoch-3_650_000;game.bp_updated_at=epoch-3_650_000;
  game.gacha_free_qty=456;game.gacha_iap_qty=123;(state as any).persist();
  const call=(route:string,target_list:unknown,target=state,actor=auth)=>gameResponse(target,"/message/"+route,{...actor,target_list}) as any;
  return {file,state,owners,auth,game,call};
}
type Fixture=ReturnType<typeof fixture>;
const games=(state:ServerState)=>structuredClone([...(state as any).gameByPvid]);
function references(game:any) {
  return {game,mail:game.mail,received:game.mail.received,deleted:game.mail.deleted,rows:[...game.mail.received],
    items:game.items,cards:game.starter_cards,recruits:game.recruited_cards,decks:game.decks,login:game.login_bonus};
}
function unchangedRefs(game:any,refs:ReturnType<typeof references>,received=true) {
  assert.equal(game,refs.game);assert.equal(game.mail,refs.mail);if(received)assert.equal(game.mail.received,refs.received);
  assert.equal(game.mail.deleted,refs.deleted);if(received)refs.rows.forEach((row,index)=>assert.equal(game.mail.received[index],row));
  assert.equal(game.items,refs.items);assert.equal(game.starter_cards,refs.cards);assert.equal(game.recruited_cards,refs.recruits);
  assert.equal(game.decks,refs.decks);assert.equal(game.login_bonus,refs.login);
}
function failedPersistence(f:Fixture,operation:()=>unknown) {
  for(const kind of ["write","rename"]) {
    const bytes=readFileSync(f.file),before=games(f.state),refs=references(f.game),destination=path.join(dir,`${path.basename(f.file)}-${kind}-blocked`);
    const blocked=kind==="write"?f.file+".tmp":destination;mkdirSync(blocked);if(kind==="rename")(f.state as any).stateFile=destination;
    try{assert.throws(operation,/EISDIR|EPERM|EACCES|EEXIST|rename/);}
    finally{(f.state as any).stateFile=f.file;rmdirSync(blocked);if(existsSync(destination+".tmp"))rmSync(destination+".tmp");}
    assert.deepEqual(readFileSync(f.file),bytes);assert.deepEqual(games(f.state),before,"disk failure cannot leak flags, removed rows, tombstones or regeneration");
    unchangedRefs(f.game,refs);
  }
}
function refused(f:Fixture,operation:()=>unknown) {
  const bytes=readFileSync(f.file),before=games(f.state),refs=references(f.game);
  assert.notEqual((operation() as any).result_code,1);assert.deepEqual(games(f.state),before);assert.deepEqual(readFileSync(f.file),bytes);unchangedRefs(f.game,refs);
}
function noWrite(f:Fixture,operation:()=>unknown) {
  const bytes=readFileSync(f.file),before=games(f.state),refs=references(f.game);mkdirSync(f.file+".tmp");
  let result:any;try{result=operation();}finally{rmdirSync(f.file+".tmp");}
  assert.deepEqual(games(f.state),before);assert.deepEqual(readFileSync(f.file),bytes);unchangedRefs(f.game,refs);return result;
}
try {
  for(const [name,route,input,ids,unread] of [
    ["read","Read","2",[2],1],
    ["archive","Archive","2",[2],1],
    ["delete-one","RemoveReceived","2,",[2],1],
    ["delete-mixed","RemoveReceived","1,3,2,3,",[1,3,2],0],
  ] as const) {
    const f=fixture(name),baseline=JSON.parse(readFileSync(f.file,"utf8")),initial=structuredClone(f.game),refs=references(f.game),operation=()=>f.call(route,input);
    if(route==="RemoveReceived") {
      for(const bad of ["", "0,", "1,,", "1,999,", "2,999,", "9007199254740992,",[2]])refused(f,()=>f.call(route,bad));
      assert.deepEqual(noWrite(f,()=>f.call(route,"1,1,")).ret_data,{unread_count:2,target_list:[1]},"known old tombstones are no-write replay, not unknown-ID authority");
    } else {
      for(const bad of ["", "0", "-1", "999", "1", "2,3",[2],"2.0"])refused(f,()=>f.call(route,bad));
    }
    refused(f,()=>f.call(route,input,f.state,f.owners[1]));
    failedPersistence(f,operation);
    const response=operation();assert.equal(response.result_code,1);
    assert.deepEqual(response.ret_data,{unread_count:unread,target_list:[...ids]},"preserve native unread/target-list receipt without user/wallet fields");
    const expected=structuredClone(initial);
    if(route==="Read")expected.mail.received[0].is_read=1;
    else if(route==="Archive")expected.mail.received[0].is_archived=1;
    else {
      expected.mail.received=expected.mail.received.filter((row:any)=>!(ids as readonly number[]).includes(row.id));
      expected.mail.deleted.push(...ids.filter(id=>!expected.mail.deleted.includes(id)));
    }
    assert.deepEqual(f.game,expected,"mail operations must not settle due AP/BP or alter gameplay");unchangedRefs(f.game,refs,route!=="RemoveReceived");
    if(route==="RemoveReceived"&&name==="delete-one")assert.equal(f.game.mail.received[0],refs.rows[1],"surviving message retains its exact row object");
    assert.equal(f.game.mail.next_id,4);assert.equal(f.game.mail.victory_notice_sent,true);
    const persisted=readFileSync(f.file),saved=JSON.parse(persisted.toString());
    assert.deepEqual(saved.accounts,baseline.accounts);assert.deepEqual(saved.gameStates.slice(1),baseline.gameStates.slice(1));
    assert.deepEqual(noWrite(f,operation).ret_data,{unread_count:unread,target_list:[...ids]},"accepted repeat cannot write or duplicate tombstones");
    refused(f,()=>f.call("RemoveReceived","1,999,"));
    const cold=new ServerState("http://localhost",f.file),coldGame=(cold as any).gameByPvid.get(f.auth.pvid);
    assert.deepEqual(coldGame,expected);mkdirSync(f.file+".tmp");
    try{assert.deepEqual(f.call(route,input,cold).ret_data,{unread_count:unread,target_list:[...ids]});}
    finally{rmdirSync(f.file+".tmp");}
    assert.deepEqual(coldGame,expected);assert.deepEqual(readFileSync(f.file),persisted);
    if(route==="RemoveReceived") {
      assert.equal(f.call("Read","2",cold).result_code,2001);assert.equal(f.call("Archive","2",cold).result_code,2001);
      assert.deepEqual(f.call("RemoveReceived","1,2,1,",cold).ret_data.target_list,[1,2]);
      assert.deepEqual(coldGame,expected);assert.deepEqual(readFileSync(f.file),persisted);
    }
  }
} finally {Date.now=realNow;assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true});}
console.log("Mail atomic state: real Read/Archive/single+mixed deletion write/rename rollback, same mail/array/row refs, all peers/game bytes, exact receipts, no-write replay/cold tombstones and unknown-batch refusal PASS.");
