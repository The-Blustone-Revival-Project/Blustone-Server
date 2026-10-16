import assert from "node:assert/strict";
import {createLocalGameState} from "../src/game.js";
import {cardInstance} from "../src/bootstrap.js";
import {planLeaderSelection} from "../src/leader-selection.js";

const game=createLocalGameState(),a=cardInstance(1_000_001,"001"),b=cardInstance(0x1_0000_0001,"002");
b.lock=1;b.rank=2;
game.starter_cards=[a];game.recruited_cards=[b];game.leader_inst_id=a.inst_id;
const refs=new Set(["001","002"]),before=structuredClone(game);
assert.deepEqual(planLeaderSelection(String(b.inst_id),game,refs),{leader_inst_id:b.inst_id,changed:true});
assert.deepEqual(planLeaderSelection(b.inst_id,game,refs),{leader_inst_id:b.inst_id,changed:true});
assert.deepEqual(planLeaderSelection(a.inst_id,game,refs),{leader_inst_id:a.inst_id,changed:false});
assert.deepEqual(game,before,"Planning never changes leader, cards, decks, inventory or wallet");
const result=planLeaderSelection(b.inst_id,game,refs);result.leader_inst_id=999;
assert.deepEqual(game,before,"Only detached primitive values are returned");
for(const raw of [undefined,null,{},[],true,0,-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1,
  "0","01"," 1000001","1000001 ","+1000001","1.0","1e6","-0","18446744073709551616","9".repeat(1000),
  "18446744073709551615","9007199254740993","99999999"])
  assert.throws(()=>planLeaderSelection(raw,game,refs),TypeError);
assert.throws(()=>planLeaderSelection(b.inst_id,game,new Set(["001"])),/published/);
const duplicate=structuredClone(game);duplicate.recruited_cards.push({...a});
assert.throws(()=>planLeaderSelection(b.inst_id,duplicate,refs),/ambiguous/);
const unsafe=structuredClone(game);unsafe.starter_cards[0].inst_id=Number.MAX_SAFE_INTEGER+1;
assert.throws(()=>planLeaderSelection(b.inst_id,unsafe,refs),/malformed/);
const malformed=structuredClone(game);malformed.recruited_cards[0].ref_id="bad\ud800";
assert.throws(()=>planLeaderSelection(b.inst_id,malformed,refs),/published/);
for(const active of ["ordinary","search","arena"] as const) {
  const busy=structuredClone(game);
  if(active==="ordinary")busy.active_battle={battle_id:"test",stage_id:"n_01_01",state:"active",started_at:0,completed_at:0,deck_inst_ids:[a.inst_id],enemy_count:1,result:0,stars:0};
  else if(active==="search")busy.search.active={} as NonNullable<typeof busy.search.active>;
  else busy.arena.active={target_pvid:2,bid:1,started_at:0,deck_inst_ids:[a.inst_id]};
  const snapshot=structuredClone(busy);
  assert.throws(()=>planLeaderSelection(b.inst_id,busy,refs),/active battle/);
  assert.deepEqual(planLeaderSelection(a.inst_id,busy,refs),{leader_inst_id:a.inst_id,changed:false},"Current-leader retry remains a no-op during combat");
  assert.deepEqual(busy,snapshot);
}
const finished=structuredClone(game);finished.active_battle={battle_id:"old",stage_id:"n_01_01",state:"completed",started_at:0,completed_at:1,deck_inst_ids:[a.inst_id],enemy_count:1,result:1,stars:1};
assert.equal(planLeaderSelection(b.inst_id,finished,refs).changed,true,"Historical completed attempt is not active combat");
console.log("Leader selection: exact positive U64 requests, safe owned identities, published/locked target admission, pure changed/no-op plans and local active-battle guards passed; no stats, decks, items or economic changes.");
