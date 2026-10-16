import assert from "node:assert/strict";
import {localArenaStandings,friendArenaRanking} from "../src/arena-rankings.js";

const wide=0x1_0000_0001;
const source=[{pvid:5,rating_point:20,win:9,lose:2},{pvid:2,rating_point:20,win:1,lose:99},
  {pvid:1,rating_point:1,win:3,lose:0},{pvid:wide,rating_point:99,win:1,lose:0},{pvid:9,rating_point:10,win:0,lose:0}];
const before=structuredClone(source),standings=localArenaStandings(source);
assert.deepEqual(standings.map(row=>[row.pvid,row.rank]),[[wide,1],[2,2],[5,3],[9,4],[1,5]]);
assert.deepEqual(source,before,"Ranking never reorders or mutates the supplied account statistics");
assert.equal(standings.find(row=>row.pvid===2)!.lose,99,"Counter values are copied, not used as an unproved tie rule");
assert.deepEqual(localArenaStandings([...source].reverse()),standings,"Tie order is independent of input enumeration");
assert.deepEqual(friendArenaRanking(standings,1,new Set([5,2])).list.map(row=>[row.pvid,row.rank]),[[2,2],[5,3],[1,5]],
  "Friend projection preserves established order/rank gaps around hidden participants");
assert.deepEqual(friendArenaRanking(standings,1,new Set()).list,[standings[4]],"Self remains present without a fabricated friend edge");
const projection=friendArenaRanking(standings,1,new Set([5]));projection.list[0].rating_point=999;
assert.equal(standings.find(row=>row.pvid===5)!.rating_point,20,"Returned friend rows do not alias the retained standings");
assert.throws(()=>friendArenaRanking(standings,1,new Set([wide])),/uint32/);
assert.throws(()=>friendArenaRanking(standings,wide,new Set()),/uint32/);
assert.throws(()=>friendArenaRanking(standings,999,new Set()),/own standing/);
assert.throws(()=>friendArenaRanking([...standings].reverse(),1,new Set()),/canonical/);
const wrongRank=structuredClone(standings);wrongRank[0].rank=0;assert.throws(()=>friendArenaRanking(wrongRank,1,new Set()),/canonical/);
const zero=localArenaStandings([{pvid:0xffff_ffff,rating_point:0,win:0,lose:0},{pvid:1,rating_point:0,win:0,lose:0}]);
assert.deepEqual(zero.map(row=>[row.pvid,row.rank]),[[1,1],[0xffff_ffff,2]]);
assert.equal(friendArenaRanking(zero,1,new Set([0xffff_ffff])).list.length,2);
assert.deepEqual(localArenaStandings([]),[]);
const max=localArenaStandings([{pvid:Number.MAX_SAFE_INTEGER,rating_point:0xffff_ffff,win:0xffff_ffff,lose:0xffff_ffff}]);
assert.equal(max[0].rank,1,"Global-local source identities may exceed friend receiver width without losing precision");
for(const id of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>localArenaStandings([{...source[0],pvid:id}]),TypeError);
for(const key of ["rating_point","win","lose"] as const)for(const value of [-1,NaN,Infinity,1.5,0x1_0000_0000])
  assert.throws(()=>localArenaStandings([{...source[0],[key]:value}]),TypeError);
assert.throws(()=>localArenaStandings([source[0],source[0]]),/duplicated/);
assert.throws(()=>localArenaStandings(Array(1)),TypeError);
const result=localArenaStandings(source);result[0].win=999;assert.deepEqual(source,before);
console.log("Arena standings: validated detached local rating/PVID ordering, sequential ties, actual counters, native friend-pvid narrowing, hidden-position gaps and required self passed; population/seasons/ties remain explicit local policy.");
