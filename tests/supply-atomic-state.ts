import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {earnSpecialSupply,SPECIAL_CLEAR_GOLD} from "../src/special-supply.js";
import {FIXTURE_FUEL_ID,FIXTURE_FUEL_AP,fuelCycle} from "../src/supply.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-supply-atomic-")),realNow=Date.now;
const epoch=Date.parse("2026-10-23T12:00:00Z");let now=epoch;Date.now=()=>now;
function fixture(name:string) {
  now=epoch;const file=path.join(dir,name+".json"),state=new ServerState("http://localhost",file);
  const owners=Array.from({length:3},(_,i)=>{
    const row=state.registerGuest({device_id:`${name}-${i}`},{}).ret_data as any;return {pvid:row.pvid,otp:row.otp};
  });
  const auth=owners[0],game=(state as any).gameByPvid.get(auth.pvid);
  // Authored already-earned local first-clear records. No native battle or
  // original economy is asserted; use the same row producer as actual clears.
  for(const stage of ["n_01_01","n_01_02","n_01_03"])earnSpecialSupply(game.special_supply,stage);
  game.special_supply.rows[0].claimed=true;
  game.ap=10;game.bp=2;game.ap_updated_at=epoch-3_650_000;game.bp_updated_at=epoch-3_650_000;
  game.gacha_free_qty=456;game.gacha_iap_qty=123;(state as any).persist();
  const call=(route:string,extra:Record<string,unknown>={},target=state)=>gameResponse(target,route,{...auth,...extra}) as any;
  return {file,state,auth,game,call};
}
type Fixture=ReturnType<typeof fixture>;
function references(game:any) {
  return {game,special:game.special_supply,rows:game.special_supply.rows,rowRefs:[...game.special_supply.rows],
    items:game.items,cards:game.starter_cards,recruits:game.recruited_cards,decks:game.decks,login:game.login_bonus};
}
function unchangedRefs(game:any,refs:ReturnType<typeof references>) {
  assert.equal(game,refs.game);assert.equal(game.special_supply,refs.special);assert.equal(game.special_supply.rows,refs.rows);
  refs.rowRefs.forEach((row,index)=>assert.equal(game.special_supply.rows[index],row));
  assert.equal(game.items,refs.items);assert.equal(game.starter_cards,refs.cards);assert.equal(game.recruited_cards,refs.recruits);
  assert.equal(game.decks,refs.decks);assert.equal(game.login_bonus,refs.login);
}
function games(state:ServerState) {return structuredClone([...(state as any).gameByPvid]);}
function failedPersistence(f:Fixture,operation:()=>unknown) {
  for(const kind of ["write","rename"]) {
    const bytes=readFileSync(f.file),before=games(f.state),refs=references(f.game),destination=path.join(dir,`${path.basename(f.file)}-${kind}-blocked`);
    const block=kind==="write"?f.file+".tmp":destination;mkdirSync(block);
    if(kind==="rename")(f.state as any).stateFile=destination;
    try{assert.throws(operation,/EISDIR|EPERM|EACCES|EEXIST|rename/);}
    finally{(f.state as any).stateFile=f.file;rmdirSync(block);if(existsSync(destination+".tmp"))rmSync(destination+".tmp");}
    assert.deepEqual(readFileSync(f.file),bytes);assert.deepEqual(games(f.state),before,"failed claims must not leak rewards, flags, regeneration or anchors into memory");
    unchangedRefs(f.game,refs);
  }
}
function refusedWithoutMutation(f:Fixture,operation:()=>unknown) {
  const bytes=readFileSync(f.file),before=games(f.state),refs=references(f.game);
  const response=operation() as any;assert.notEqual(response.result_code,1);assert.deepEqual(games(f.state),before);assert.deepEqual(readFileSync(f.file),bytes);unchangedRefs(f.game,refs);
}
try {
  for(const [name,ids,award] of [["single",[2],SPECIAL_CLEAR_GOLD],["mixed-all",[1,2,3],2*SPECIAL_CLEAR_GOLD]] as const) {
    const f=fixture(name),claim=()=>f.call("/supply/SpecialListReward",{id_list:JSON.stringify(ids)}),baseline=JSON.parse(readFileSync(f.file,"utf8"));
    const initial=structuredClone(f.game),refs=references(f.game);
    for(const bad of [[],"", "[]", "[1,1]", "[2,999]", '["2"]',"[0]","not-json"])
      refusedWithoutMutation(f,()=>f.call("/supply/SpecialListReward",{id_list:bad}));
    const previousGold=f.game.gold;
    for(const value of [0xffff_ffff,-1,0x1_0000_0000]) {
      f.game.gold=value;refusedWithoutMutation(f,claim);f.game.gold=previousGold;
    }
    failedPersistence(f,claim);
    const claimed=claim();assert.equal(claimed.result_code,1);
    assert.deepEqual(claimed.ret_data,{target_inst_id:[...ids],user:{gold:{prev:initial.gold,cur:initial.gold+award}}},"preserve targeted native gold/ID receipt; do not add generic Manda or reward fields");
    const expected=structuredClone(initial);expected.gold+=award;
    for(const row of expected.special_supply.rows)if((ids as readonly number[]).includes(row.id))row.claimed=true;
    assert.deepEqual(f.game,expected);unchangedRefs(f.game,refs);
    assert.deepEqual([f.game.ap,f.game.bp,f.game.ap_updated_at,f.game.bp_updated_at],
      [initial.ap,initial.bp,initial.ap_updated_at,initial.bp_updated_at],"Special Supply must not opportunistically recover due AP/BP");
    const persisted=readFileSync(f.file),saved=JSON.parse(persisted.toString());
    assert.deepEqual(saved.accounts,baseline.accounts);assert.deepEqual(saved.gameStates.slice(1),baseline.gameStates.slice(1));
    assert.deepEqual(claim().ret_data,{target_inst_id:[...ids]},"already-claimed batch settles without another gold application");
    assert.deepEqual(readFileSync(f.file),persisted);assert.deepEqual(f.game,expected);
    const cold=new ServerState("http://localhost",f.file),coldGame=(cold as any).gameByPvid.get(f.auth.pvid);
    assert.deepEqual(coldGame,expected);const replay=f.call("/supply/SpecialListReward",{id_list:JSON.stringify(ids)},cold);
    assert.deepEqual(replay.ret_data,{target_inst_id:[...ids]});assert.deepEqual(coldGame,expected);assert.deepEqual(readFileSync(f.file),persisted);
  }

  const f=fixture("activity"),claim=()=>f.call("/supply/ActivityReward",{id:FIXTURE_FUEL_ID}),initial=structuredClone(f.game),refs=references(f.game);
  const baseline=JSON.parse(readFileSync(f.file,"utf8"));
  for(const id of [undefined,null,"AP1",0,{},"local_fuel_0 "])refusedWithoutMutation(f,()=>f.call("/supply/ActivityReward",{id}));
  const previousDay=f.game.supply_fuel_claim_day;
  f.game.supply_fuel_claim_day=fuelCycle(now).day;refusedWithoutMutation(f,claim);
  f.game.supply_fuel_claim_day=fuelCycle(now).day+1;refusedWithoutMutation(f,claim);f.game.supply_fuel_claim_day=previousDay;
  for(const value of [0xffff_ffff,0xffff_ffff-FIXTURE_FUEL_AP+1,-1,0x1_0000_0000,0.5]) {
    f.game.ap=value;refusedWithoutMutation(f,claim);f.game.ap=initial.ap;
  }
  // Invalid host clocks may raise or return failure, but may never regenerate,
  // reanchor or write before the clock/claim has been admitted.
  for(const badNow of [NaN,Infinity,-1,epoch+0.5]) {
    const bytes=readFileSync(f.file),before=games(f.state);now=badNow;
    let refused=false;try{refused=(claim() as any).result_code!==1;}catch{refused=true;}
    assert.equal(refused,true);assert.deepEqual(games(f.state),before);assert.deepEqual(readFileSync(f.file),bytes);unchangedRefs(f.game,refs);now=epoch;
  }
  now=0x1_0000_0000*1000;refusedWithoutMutation(f,claim);now=epoch;
  failedPersistence(f,claim);
  const success=claim();assert.equal(success.result_code,1);
  const anchor=epoch-50_000,expected=structuredClone(initial);
  // 3650 elapsed seconds =12 AP periods of300 and2 BP periods of1800.
  expected.ap=10+12+FIXTURE_FUEL_AP;expected.bp=2+2;expected.ap_updated_at=anchor;expected.bp_updated_at=anchor;
  expected.supply_fuel_claim_day=fuelCycle(epoch).day;
  assert.deepEqual(success.ret_data,{target_inst:{id:FIXTURE_FUEL_ID,status:2},user:{ap:{cur:32,ap_charge_time:Math.floor(anchor/1000)+300}}});
  assert.deepEqual(f.game,expected);unchangedRefs(f.game,refs);
  assert.deepEqual([f.game.gacha_free_qty,f.game.gacha_iap_qty],[456,123]);
  const settled=readFileSync(f.file),saved=JSON.parse(settled.toString());
  assert.deepEqual(saved.accounts,baseline.accounts);assert.deepEqual(saved.gameStates.slice(1),baseline.gameStates.slice(1));
  refusedWithoutMutation(f,claim);
  // A same-cycle retry after a backwards clock cannot reanchor future resource
  // clocks, reopen the cycle, or persist a regeneration-only write.
  now=epoch-86_400_000;refusedWithoutMutation(f,claim);now=epoch;
  const cold=new ServerState("http://localhost",f.file);assert.deepEqual((cold as any).gameByPvid.get(f.auth.pvid),expected);
  assert.notEqual(f.call("/supply/ActivityReward",{id:FIXTURE_FUEL_ID},cold).result_code,1);assert.deepEqual(readFileSync(f.file),settled);
  const boundary=fixture("activity-u32-boundary");boundary.game.ap=0xffff_ffff-FIXTURE_FUEL_AP;
  (boundary.state as any).persist();
  const lastValid=boundary.call("/supply/ActivityReward",{id:FIXTURE_FUEL_ID});
  assert.equal(lastValid.result_code,1);assert.equal(lastValid.ret_data.user.ap.cur,0xffff_ffff);
  assert.equal(boundary.game.ap,0xffff_ffff,"Last native uint32 balance preserves earned overflow above max_ap");
} finally {Date.now=realNow;assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true});}
console.log("Supply atomic state: real single/mixed Special and due-regeneration Activity write/rename rollback, same nested references/peers/bytes, exact native receipts, refusal without regen and once-only cold retry PASS.");
