import assert from "node:assert/strict";
import {createLocalGameState} from "../src/game.js";
import {friendMissionRecords} from "../src/friend-mission-records.js";

const game=createLocalGameState(),order=["n_01_01","n_01_02","n_02_01"];
const peer={pvid:2,profile_url:"http://localhost/portrait.png",game};
assert.deepEqual(friendMissionRecords([peer],order),[],"Open/available stages are not earned progress");
game.stage_achievements.n_01_01=[0,2];
game.stage_stars.n_01_02=3;game.stage_achievements.n_01_02=[];
game.cleared_stage_ids.push("n_01_02","unknown");
assert.deepEqual(friendMissionRecords([peer],order),[{pvid:2,profile_url:peer.profile_url,stage:"n_01_01"}],
  "Explicit empty flags override historical count/cleared fallback");
game.stage_achievements.n_02_01=[0];game.stage_achievements.n_99_99=[0,1,2];
const before=JSON.stringify(game);
assert.deepEqual(friendMissionRecords([peer],order),[{pvid:2,profile_url:peer.profile_url,stage:"n_02_01"}],
  "Placement uses published order, not maximum unknown stage suffix or star count");
const legacy=createLocalGameState();legacy.cleared_stage_ids=["n_01_02"];
assert.equal(friendMissionRecords([{...peer,game:legacy}],order)[0].stage,"n_01_02");
legacy.stage_stars.n_02_01=1;
assert.equal(friendMissionRecords([{...peer,game:legacy}],order)[0].stage,"n_02_01");
assert.deepEqual(friendMissionRecords([{...peer,game:undefined}],order),[]);
assert.deepEqual(friendMissionRecords([peer,{...peer,pvid:1}],order).map(row=>row.pvid),[1,2]);
const projected=friendMissionRecords([peer],order);projected[0].stage="MUTATED";
assert.equal(JSON.stringify(game),before,"Projection cannot change stage flags/energy/wallet");
assert.throws(()=>friendMissionRecords([peer,peer],order),/duplicate/);
assert.throws(()=>friendMissionRecords([peer],["n_01_01","n_01_01"]),/unique/);
assert.throws(()=>friendMissionRecords([peer],["CB0101"]),/ordinary/);
for(const pvid of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,NaN])assert.throws(()=>friendMissionRecords([{...peer,pvid}],order));
assert.throws(()=>friendMissionRecords([{...peer,profile_url:"bad\ud800"}],order));
console.log("Friend mission projection: source-shaped bare rows, actually earned published progress, explicit empty/noncontiguous flags, legacy fallback, detached deterministic identities and no game creation passed; placement is local policy.");
