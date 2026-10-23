import assert from 'node:assert/strict';
import {validatedMiragePolicy,createMirageRun,normalizeMirageRun,advanceMirageReward,abandonMirageRun,type MirageRun} from '../src/mirage-run.js';
import {configuredMirageReentry,createMirageSeries,adoptTerminalMirageSeries,normalizeMirageSeries,proposeMirageReentry,consumeMirageReentry,mirageReentryDay,mirageReentryBeginTime} from '../src/mirage-reentry.js';

const now=1_800_000_000,enemy={ref_id:'AUTHORED_ENEMY',hp_percent:10000,rank:1,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:0,skill_3_level:0,skill_4_level:0,skill_5_level:0};
const floor=(floor:number)=>validatedMiragePolicy({enrollment:'rank-exp-id-projection',floor,bg_res:'AUTHORED_BG',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],
  stairs:[7,11,13].map((gold,grade)=>({grade,balance:10000,enemies:[enemy],gold})),hero:{bonus:0,end_ltime:1_900_000_000,cur:[],next:[]},revive_prices:[3,5]});
const first=floor(2),lower=floor(1),deeper=floor(3);
const raw={payment:'free-local',daily_attempts:2,day_offset_minutes:0,on_unavailable:'abandon-local',floors:[deeper,lower],
  transitions:[{floor:3,cleared:3,failed:2},{floor:2,cleared:3,failed:1},{floor:1,cleared:2,failed:1}]};
const policy=configuredMirageReentry(raw,first),entries=[{id:1000001,mirage_remain_hp:10000}];
const fresh=(definition=first,time=now)=>createMirageRun(definition,entries,['1000001'],time);
const run=fresh(),series=createMirageSeries(policy,run,now),before=structuredClone({raw,run,series});
assert.deepEqual(policy.floors.map(row=>row.floor),[1,2,3]);assert.equal(policy.initial_floor,2);
assert.deepEqual(policy.transitions.map(row=>row.floor),[1,2,3]);
assert.ok(Object.isFrozen(policy)&&Object.isFrozen(policy.floors)&&Object.isFrozen(policy.floors[0].stairs[0].enemies[0]));
assert.equal(series.generation,1);assert.equal(series.used,1);assert.equal(series.highest,0);assert.deepEqual(series.history,[]);
assert.throws(()=>consumeMirageReentry(series,run,false,now),/offered/);
const offered=proposeMirageReentry(series,run,now);assert.equal(offered.next_floor,1);assert.equal(offered.replay,false);
assert.equal(offered.series.offer!.action,'reenter');assert.match(offered.series.offer!.token,/^[a-f0-9]{64}$/);
assert.equal(proposeMirageReentry(offered.series,run,now).replay,true);
const advanced=consumeMirageReentry(offered.series,run,false,now);assert.equal(advanced.action,'reenter');assert.equal(advanced.floor,1);
assert.ok('newPolicy' in advanced);assert.equal(advanced.newPolicy!.floor,1);assert.equal(advanced.series.generation,2);assert.equal(advanced.series.used,2);
assert.deepEqual(advanced.series.history,[{generation:1,floor:2,begin_ltime:now,claimed:[],revive_ids:[],abandoned:false,completed:false}]);
const secondRun=fresh(lower),second=normalizeMirageSeries(advanced.series,secondRun);
assert.equal(second.last_reset!.generation,2);assert.equal(consumeMirageReentry(second,secondRun,false,now).replay,true);
assert.throws(()=>consumeMirageReentry(second,secondRun,true,now),/offered/);
const sameFloor=consumeMirageReentry(offered.series,run,true,now);assert.equal(sameFloor.floor,2);assert.equal(sameFloor.series.used,2);
assert.equal(normalizeMirageSeries(sameFloor.series,fresh()).generation,2,'Stay spends quota on a genuinely new same-floor attempt');
const exhausted=proposeMirageReentry(second,secondRun,now);assert.equal(exhausted.next_floor,1);assert.equal(exhausted.series.offer!.action,'abandon');
const abort=consumeMirageReentry(exhausted.series,secondRun,true,now);assert.equal(abort.action,'abandon');assert.equal(abort.series.generation,2);assert.equal(abort.series.used,2);
const abandoned=abandonMirageRun(secondRun),aborted=normalizeMirageSeries(abort.series,abandoned);
assert.equal(consumeMirageReentry(aborted,abandoned,true,now).replay,true);
const inspect=proposeMirageReentry(aborted,abandoned,now);assert.equal(inspect.series.offer!.action,'inspect');assert.equal(inspect.next_floor,1);
const inspected=consumeMirageReentry(inspect.series,abandoned,true,now);assert.equal(inspected.action,'inspect');assert.equal(inspected.series.used,2);
const privateBegin=run.cache.inst_base.begin_ltime;
assert.ok(mirageReentryBeginTime(series,run,now)+86400<now,'Available quota must not inherit an accidental24hour native wait');
assert.ok(mirageReentryBeginTime(second,secondRun,now)+86400<now,'Active quota exhaustion retains immediate local abandon access');
const tomorrow=(Math.floor(now/86400)+1)*86400;
const blockedWireBegin=mirageReentryBeginTime(aborted,abandoned,now);
assert.equal(blockedWireBegin+86400,tomorrow,'Inactive exhausted clock uses configured midnight, not last attempt plus24hours');
assert.equal(tomorrow>blockedWireBegin+86400,false,'Native BGE still blocks at exact countdown zero');
assert.equal(tomorrow+1>blockedWireBegin+86400,true);
assert.ok(mirageReentryBeginTime(aborted,abandoned,tomorrow)+86400<tomorrow,'Fresh boundary read reflects renewed allowance immediately');
assert.equal(run.cache.inst_base.begin_ltime,privateBegin,'Wire projection never rewrites enrollment history');

const tomorrowOffer=proposeMirageReentry(aborted,abandoned,tomorrow);assert.equal(tomorrowOffer.series.offer!.action,'reenter');
const tomorrowChoice=consumeMirageReentry(tomorrowOffer.series,abandoned,false,tomorrow);
assert.equal(tomorrowChoice.series.used,1);assert.equal(tomorrowChoice.series.generation,3);
assert.equal(tomorrowChoice.series.history[1].abandoned,true);
assert.equal(normalizeMirageSeries(tomorrowChoice.series,fresh(lower,tomorrow)).day,Math.floor(tomorrow/86400));

function win(raw:MirageRun):MirageRun {
  const next=structuredClone(raw),base=next.cache.inst_base;next.cache.entry[0].mirage_remain_hp=8000;
  next.cache.inst_enemy.forEach(row=>row.hp_percent=0);base.state=2;
  const deck=[{id:'1000001',hp:8000}],enemy=[0];
  next.lastEnd={fingerprint:JSON.stringify({floor:base.floor,stair:base.stair,deck,enemy}),receipt:{state:2,deck:[{inst_id:1000001,remain_hp_percent:8000}],
    dailyquest_min_stage:'',daily_quest:[],linear_quest:[],achievement:[]}};return normalizeMirageRun(next);
}
let complete=run;for(let i=0;i<3;i++)complete=advanceMirageReward(win(complete)).run;
const finishedSeries={...series,highest:2};assert.equal(normalizeMirageSeries(finishedSeries,complete).highest,2);
const down=proposeMirageReentry(finishedSeries,complete,now);assert.equal(down.next_floor,3);
const downConsumed=consumeMirageReentry(down.series,complete,false,now);assert.equal(downConsumed.floor,3);assert.equal(downConsumed.series.highest,2);
assert.deepEqual(downConsumed.series.history[0].claimed,[1,2,3]);assert.equal(downConsumed.series.history[0].completed,true);
assert.equal(Object.hasOwn(downConsumed.series.history[0],'entry'),false);assert.equal(Object.hasOwn(downConsumed.series.history[0],'deck'),false);
assert.equal(normalizeMirageSeries(downConsumed.series,fresh(deeper)).highest,2);
const quotaOne=configuredMirageReentry({...raw,daily_attempts:1},first),one=createMirageSeries(quotaOne,run,now);
const oneComplete={...one,highest:2},oneOffer=proposeMirageReentry(oneComplete,complete,now);
assert.equal(oneOffer.series.offer!.action,'inspect');assert.equal(oneOffer.next_floor,2);
assert.equal(consumeMirageReentry(oneOffer.series,complete,true,now).series.used,1);

// Terminal adoption binds existing evidence rather than creating/healing an
// attempt at adoption time. Completed and partial abandoned outcomes differ.
const partialAbandoned=abandonMirageRun(advanceMirageReward(win(run)).run);
const paidAbandoned=structuredClone(partialAbandoned);paidAbandoned.revive_ids=[1000001];paidAbandoned.cache.inst_base.revive_price=5;
const terminalPaid=normalizeMirageRun(paidAbandoned),adoptionTime=now+86400+30;
for(const terminal of [complete,partialAbandoned,terminalPaid]) {
  const original=structuredClone(terminal),capturedBefore=structuredClone(quotaOne);
  const adopted=adoptTerminalMirageSeries(quotaOne,terminal,adoptionTime);
  assert.deepEqual(terminal,original,'Adoption preserves original begin/claims/revive IDs/cache/policy');assert.deepEqual(quotaOne,capturedBefore);
  assert.equal(adopted.generation,1);assert.deepEqual(adopted.history,[]);assert.equal(adopted.used,1);
  assert.equal(adopted.day,mirageReentryDay(quotaOne,now));assert.notEqual(adopted.day,mirageReentryDay(quotaOne,adoptionTime));
  assert.equal(adopted.highest,terminal.cache.inst_base.highest);assert.deepEqual(adopted.policy,quotaOne);
  assert.equal(Object.hasOwn(adopted,'offer'),false);assert.equal(Object.hasOwn(adopted,'last_reset'),false);
  const sameDay=adoptTerminalMirageSeries(quotaOne,terminal,now);
  assert.equal(proposeMirageReentry(sameDay,terminal,now+1).series.offer!.action,'inspect','Initial attempt already consumes same-day quota');
  const nextDayOffer=proposeMirageReentry(adopted,terminal,adoptionTime);
  assert.equal(nextDayOffer.series.offer!.action,'reenter','Yesterday use is not charged again on adoption day');
  const consumed=consumeMirageReentry(nextDayOffer.series,terminal,true,adoptionTime);
  assert.equal(consumed.series.used,1);assert.equal(consumed.series.generation,2);assert.equal(consumed.series.day,mirageReentryDay(quotaOne,adoptionTime));
  assert.equal(consumed.series.history[0].begin_ltime,now);assert.deepEqual(consumed.series.history[0].claimed,terminal.claimed);
  assert.deepEqual(consumed.series.history[0].revive_ids,terminal.revive_ids);
  assert.equal(consumed.series.history[0].abandoned,terminal.abandoned===true);assert.equal(consumed.series.history[0].completed,!terminal.abandoned);
  assert.deepEqual(terminal,original,'Offer/consumption archives old evidence without changing the adopted run');
  assert.throws(()=>createMirageSeries(quotaOne,terminal,adoptionTime),/fresh/,'Fresh-run creation must not become a terminal-adoption shortcut');
}
assert.equal(adoptTerminalMirageSeries(quotaOne,complete,now).highest,2);
assert.equal(adoptTerminalMirageSeries(quotaOne,partialAbandoned,now).highest,0);
assert.throws(()=>adoptTerminalMirageSeries(quotaOne,run,now),/terminal/);
assert.throws(()=>adoptTerminalMirageSeries(quotaOne,win(run),now),/terminal/);
assert.throws(()=>adoptTerminalMirageSeries(quotaOne,complete,now-1),/rollback/);
for(const invalidNow of [-1,0.5,NaN,Infinity,0x80000000])assert.throws(()=>adoptTerminalMirageSeries(quotaOne,complete,invalidNow));
const changedFirst={...structuredClone(first),stairs:first.stairs.map((row,index)=>({...structuredClone(row),gold:row.gold+(index===0?1:0)}))};
const changedPolicy=configuredMirageReentry(raw,changedFirst);
assert.throws(()=>adoptTerminalMirageSeries(changedPolicy,complete,now),/differs/,'Cannot retune captured initial policy');
const otherInitial=configuredMirageReentry({...raw,floors:[first,deeper]},lower);
assert.throws(()=>adoptTerminalMirageSeries(otherInitial,complete,now),/initial-floor/,'A known noninitial floor is not a legacy initial attempt');
const malformedTerminal=structuredClone(partialAbandoned);malformedTerminal.cache.entry=[{id:1000001,mirage_remain_hp:10000}];
assert.throws(()=>adoptTerminalMirageSeries(quotaOne,malformedTerminal,now));
const expiredAdoption=adoptTerminalMirageSeries(quotaOne,complete,first.hero.end_ltime+1);
assert.equal(proposeMirageReentry(expiredAdoption,complete,first.hero.end_ltime+1).series.offer!.action,'inspect',
  'Adopting old terminal evidence does not renew its expired content deadline');

// A changed HP/party/claim snapshot invalidates an existing offer without
// making the captured stale metadata impossible to restore.
const damaged=structuredClone(run);damaged.cache.entry[0].mirage_remain_hp=9000;
assert.doesNotThrow(()=>normalizeMirageSeries(offered.series,damaged));
assert.throws(()=>consumeMirageReentry(offered.series,damaged,false,now),/stale/);
const refreshed=proposeMirageReentry(offered.series,damaged,now);assert.equal(refreshed.replay,false);
assert.notEqual(refreshed.series.offer!.token,offered.series.offer!.token);
assert.throws(()=>consumeMirageReentry(offered.series,run,false,tomorrow),/stale/);
assert.throws(()=>proposeMirageReentry(series,run,now-1),/rollback/);
assert.throws(()=>consumeMirageReentry(offered.series,run,false,now-1),/rollback/);
assert.equal(mirageReentryDay({...policy,day_offset_minutes:60},86399),1);
assert.equal(mirageReentryDay({...policy,day_offset_minutes:-60},0),-1);
assert.equal(mirageReentryDay({...policy,day_offset_minutes:840},36000),1);
assert.throws(()=>mirageReentryDay(policy,0x8000_0000));
assert.throws(()=>createMirageSeries(policy,run,now+1),/fresh/);
assert.throws(()=>normalizeMirageSeries({...series,highest:99},run),/highest/);
assert.throws(()=>normalizeMirageSeries({...series,used:2},run),/usage/);
assert.throws(()=>normalizeMirageSeries({...series,generation:2},run),/generation/);
assert.throws(()=>normalizeMirageSeries({...series,day:series.day+1},run),/day/);
assert.throws(()=>normalizeMirageSeries({...series,last_reset:{generation:2,stay:true}},run),/generation/);
assert.throws(()=>normalizeMirageSeries({...series,offer:{...offered.series.offer,target:99}},run),/offer/);
assert.throws(()=>normalizeMirageSeries({...series,offer:{...offered.series.offer,token:'fake'}},run),/offer/);
assert.throws(()=>normalizeMirageSeries({...series,offer:{...offered.series.offer,generation:2}},run));
for(const change of [
  (p:any)=>p.payment='manda',(p:any)=>p.daily_attempts=0,(p:any)=>p.daily_attempts=101,(p:any)=>p.day_offset_minutes=841,
  (p:any)=>p.day_offset_minutes=0.5,(p:any)=>p.on_unavailable='free-heal',
  (p:any)=>p.floors.push(first),(p:any)=>p.floors.push(p.floors[0]),(p:any)=>p.transitions.pop(),
  (p:any)=>p.transitions.push(p.transitions[0]),(p:any)=>p.transitions[0].failed=99,
  (p:any)=>p.unknown=true,(p:any)=>p.floors[0]={...p.floors[0],extra:true},
]) {const bad=structuredClone(raw);change(bad);assert.throws(()=>configuredMirageReentry(bad,first));}
let getter=false;const dangerous={...raw};Object.defineProperty(dangerous,'daily_attempts',{enumerable:true,get(){getter=true;return 2;}});
assert.throws(()=>configuredMirageReentry(dangerous,first));assert.equal(getter,false);
assert.throws(()=>configuredMirageReentry({...raw,floors:Array(2)},first));
const badHistory=structuredClone(downConsumed.series);(badHistory.history[0] as any).entry=entries;
assert.throws(()=>normalizeMirageSeries(badHistory,fresh(deeper)));
const unpaid=structuredClone(downConsumed.series);delete unpaid.history[0].revive_ids;
assert.throws(()=>normalizeMirageSeries(unpaid,fresh(deeper)),/first-aid/);
const oldFloor=structuredClone(first);delete (oldFloor as any).revive_prices;
const oldPolicy=configuredMirageReentry({...raw,floors:[],transitions:[{floor:2,cleared:2,failed:2}]},oldFloor);
const oldRun=fresh(oldFloor),oldSeries=createMirageSeries(oldPolicy,oldRun,now);
const oldOffer=proposeMirageReentry(oldSeries,oldRun,now),oldNext=consumeMirageReentry(oldOffer.series,oldRun,true,now);
assert.equal(Object.hasOwn(oldNext.series.history[0],'revive_ids'),false,'Policies without first aid retain omitted history fields');
assert.equal(normalizeMirageSeries(oldNext.series,fresh(oldFloor)).generation,2);
const atLimit={...series,generation:10001,history:Array.from({length:10000},(_,i)=>({generation:i+1,floor:2,
  begin_ltime:now-(10000-i)*86400,claimed:[],revive_ids:[],abandoned:false,completed:false}))};
assert.doesNotThrow(()=>normalizeMirageSeries(atLimit,run));
assert.equal(proposeMirageReentry(atLimit,run,now).series.offer!.action,'abandon','Archive cap cannot trap an active cohort');
assert.throws(()=>normalizeMirageSeries({...atLimit,generation:10002},run));
// Explicit unavailable fallback prevents expired configured content trapping
// committed/dead Hunters even though daily quota still permits another run.
const expiry=now+10,expiredFloors=[first,lower,deeper].map(row=>({...structuredClone(row),hero:{...row.hero,end_ltime:expiry}}));
const expiredPolicy=configuredMirageReentry({...raw,floors:expiredFloors.filter(row=>row.floor!==first.floor)},expiredFloors.find(row=>row.floor===first.floor)!);
const expiryRun=fresh(expiredPolicy.floors.find(row=>row.floor===first.floor)!);
const expirySeries=createMirageSeries(expiredPolicy,expiryRun,now),allDead=structuredClone(expiryRun);
allDead.cache.entry.forEach(row=>row.mirage_remain_hp=0);
const expiredOffer=proposeMirageReentry(expirySeries,allDead,expiry+1);
assert.equal(expiredOffer.series.offer!.action,'abandon');assert.equal(expiredOffer.next_floor,2);
const expiredAbort=consumeMirageReentry(expiredOffer.series,allDead,true,expiry+1);
assert.equal(expiredAbort.action,'abandon');assert.equal(expiredAbort.series.used,1);assert.equal(expiredAbort.series.generation,1);
assert.doesNotThrow(()=>normalizeMirageSeries(expiredAbort.series,abandonMirageRun(allDead)));
const inactiveExpired=abandonMirageRun(expiryRun);
assert.equal(proposeMirageReentry(expirySeries,inactiveExpired,expiry+1).series.offer!.action,'inspect');
const offeredBeforeExpiry=proposeMirageReentry(expirySeries,expiryRun,expiry);
assert.equal(offeredBeforeExpiry.series.offer!.action,'reenter','Exact deadline remains eligible');
assert.throws(()=>consumeMirageReentry(offeredBeforeExpiry.series,expiryRun,false,expiry+1),/stale/);
assert.equal(proposeMirageReentry(offeredBeforeExpiry.series,expiryRun,expiry+1).series.offer!.action,'abandon');
// An expired current floor may propose a still-live destination, but Stay
// must not charge usage or reset HP into an expired same-floor attempt.
const liveTargetPolicy=configuredMirageReentry({...raw,floors:[lower,deeper]},expiredFloors.find(row=>row.floor===2)!);
const currentExpiredRun=fresh(liveTargetPolicy.floors.find(row=>row.floor===2)!);
const currentExpiredSeries=createMirageSeries(liveTargetPolicy,currentExpiredRun,now);
const liveOffer=proposeMirageReentry(currentExpiredSeries,currentExpiredRun,expiry+1);
assert.equal(liveOffer.series.offer!.action,'reenter');assert.equal(liveOffer.next_floor,1);
const unspent=structuredClone(liveOffer.series);
assert.throws(()=>consumeMirageReentry(liveOffer.series,currentExpiredRun,true,expiry+1),/deadline/);
assert.deepEqual(liveOffer.series,unspent);assert.equal(liveOffer.series.used,1);assert.equal(liveOffer.series.generation,1);
assert.equal(consumeMirageReentry(liveOffer.series,currentExpiredRun,false,expiry+1).floor,1);
assert.deepEqual({raw,run,series},before,'All proposals/consumption and archive projections are pure');
console.log('Mirage re-entry pure policy/series: explicit quota+offset/transitions, samefloor stay, clear/deeper+fail/shallower, archive/highest/dayreset, exhaustionabort/inspect, replay/staleoffer/rollback and strictimmutable malformed-data gates passed.');
