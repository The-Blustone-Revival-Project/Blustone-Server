import assert from "node:assert/strict";
import {gvgPhaseAt,gvgPhaseTimingAt,gvgScheduleTimes} from "../src/gvg-phase.js";
// Authored timestamps exercise original selector branches, not a live schedule.
const schedule={teaser_begin_dtm:100,register_begin_dtm:200,matching_begin_dtm:300,deploy_begin_dtm:400,
  combat_begin_dtm:500,calc_begin_dtm:600,result_begin_dtm:700,finish_dtm:800,next_gvg_dtm:900};
const before=JSON.stringify(schedule);
assert.equal(gvgPhaseAt(schedule,0),0);assert.equal(gvgPhaseAt(schedule,99),0);
for(const [time,prior,next] of [[100,0,1],[200,1,2],[300,2,3],[400,3,4],[500,4,5],
  [600,5,6],[700,6,7],[800,7,8],[900,8,9]]) {
  assert.equal(gvgPhaseAt(schedule,time),prior,"Native equality is not phase admission");
  assert.equal(gvgPhaseAt(schedule,time+1),next);
}
assert.equal(gvgPhaseAt(schedule,199,2),2);
assert.equal(gvgPhaseAt(schedule,201,-2),1);
assert.deepEqual(gvgPhaseTimingAt(schedule,365,15),{phase:3,nextServerSeconds:385},"Native pair contains absolute next timestamp minus jump, not countdown20");
assert.deepEqual(gvgPhaseTimingAt(schedule,99),{phase:0,nextServerSeconds:0});
assert.deepEqual(gvgPhaseTimingAt(schedule,901),{phase:9,nextServerSeconds:0});
const disabled={teaser_begin_dtm:0,register_begin_dtm:0,matching_begin_dtm:0,deploy_begin_dtm:0,
  combat_begin_dtm:0,calc_begin_dtm:0,result_begin_dtm:0,finish_dtm:0,next_gvg_dtm:0};
assert.equal(gvgPhaseAt(disabled,0x7fff_ffff),0,"Explicit zero markers are disabled; none are generated");
assert.equal(gvgPhaseAt({...disabled,finish_dtm:1,teaser_begin_dtm:2},3),8,"Higher phase wins even when timestamps are out of chronological order");
assert.equal(gvgPhaseAt({...disabled,next_gvg_dtm:1,finish_dtm:2},3),9);
const parsed=gvgScheduleTimes({...schedule,id:"OTHER_FIELDS_NOT_VALIDATED"});parsed.combat_begin_dtm=0;
assert.equal(schedule.combat_begin_dtm,500);assert.equal(JSON.stringify(schedule),before);
for(const bad of ["2026-10-13T00:00:00Z",undefined,-0x8000_0001,0x1_0000_0000,1.5,NaN])
  assert.throws(()=>gvgPhaseAt({...schedule,combat_begin_dtm:bad},500));
assert.throws(()=>gvgPhaseAt({},500));
assert.equal(gvgPhaseAt(schedule,0,-1),0);
assert.equal(gvgPhaseAt(schedule,0x7fff_ffff,1),0,"Native positive clock overflow wraps to negative signed time");
assert.equal(gvgPhaseAt({...disabled,teaser_begin_dtm:0x8000_0000},0x7fff_ffff),0,"Signed comparison ignores negative marker bits");
assert.equal(gvgPhaseAt({...disabled,teaser_begin_dtm:1},0xffff_ffff,3),1,"Unsigned clock spelling plus signed jump preserves native lowword arithmetic");
assert.equal(gvgPhaseAt(schedule,0xffff_ffff,0x7fff_ffff),9);
assert.equal(gvgPhaseAt({...disabled,next_gvg_dtm:-1},900),0);
assert.throws(()=>gvgPhaseAt(schedule,500,0x8000_0000));
console.log("GvG native phase selector: strict equality, nine descending phases, explicit disabled markers, signed time jumps/wrap, detached extraction and exact clock words passed; no reference or participation activated.");
