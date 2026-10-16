import assert from "node:assert/strict";
import {ARENA_COMMENT_DEFAULTS,parseArenaCommentInfo,normalizeArenaComments,planArenaComments,LOCAL_ARENA_COMMENT_CODEPOINTS} from "../src/arena-comments.js";

assert.equal(Object.isFrozen(ARENA_COMMENT_DEFAULTS),true);
assert.deepEqual(parseArenaCommentInfo('{"win_message":"Well fought!"}'),{win_message:"Well fought!"});
assert.deepEqual(planArenaComments(undefined,{}),{next:undefined,changed:false});
const first=planArenaComments(undefined,{start_message:ARENA_COMMENT_DEFAULTS.start_message});
assert.equal(first.changed,true,"First explicit selection captures state even if it matches current default text");
assert.deepEqual(first.next,ARENA_COMMENT_DEFAULTS);assert.notEqual(first.next,ARENA_COMMENT_DEFAULTS);
const current={start_message:"Hello 🌊",win_message:"Victory!",lose_message:"Next time!"},before=structuredClone(current);
const patch={win_message:" יפה מאוד 🎉 "},planned=planArenaComments(current,patch);
assert.equal(planned.changed,true);assert.deepEqual(planned.next,{...current,win_message:patch.win_message});
assert.deepEqual(current,before);patch.win_message="MUTATED";assert.equal(planned.next!.win_message," יפה מאוד 🎉 ","No trimming or input alias");
planned.next!.start_message="MUTATED";assert.deepEqual(current,before);
const same=planArenaComments(current,{win_message:current.win_message});assert.equal(same.changed,false);assert.notEqual(same.next,current);
const empty=planArenaComments(current,"{}");assert.equal(empty.changed,false);assert.deepEqual(empty.next,current);assert.notEqual(empty.next,current);
assert.deepEqual(normalizeArenaComments(current),current);assert.notEqual(normalizeArenaComments(current),current);
assert.equal([..."😀".repeat(128)].length,LOCAL_ARENA_COMMENT_CODEPOINTS);
assert.deepEqual(parseArenaCommentInfo({lose_message:"😀".repeat(128)}),{lose_message:"😀".repeat(128)},"Count Unicode codepoints, not UTF16 units");
assert.deepEqual(parseArenaCommentInfo({start_message:"quotes \" and \\ literal"}),{start_message:"quotes \" and \\ literal"});
for(const raw of [undefined,null,[],true,1,"bad","null","[]",'{"win_message":1}',
  {type:1},{comment:"x"},{win_message:""},{win_message:"x".repeat(129)},{win_message:"😀".repeat(129)},
  {start_message:"bad\ud800"},{win_message:undefined},{lose_message:null},Object.create(current),Object.assign(Object.create(null),current)])
  assert.throws(()=>parseArenaCommentInfo(raw),TypeError);
for(let code=0;code<32;code++)assert.throws(()=>parseArenaCommentInfo({win_message:"a"+String.fromCharCode(code)+"b"}),TypeError);
for(const raw of [{}, {start_message:"hi"},{...current,extra:"x"},{...current,win_message:""},{...current,lose_message:"bad\udfff"}])
  assert.throws(()=>normalizeArenaComments(raw),TypeError,"Stored data must be complete and valid, not patched with defaults");
let getters=0;const getter={};Object.defineProperty(getter,"win_message",{enumerable:true,get(){getters++;return "bad";}});
assert.throws(()=>parseArenaCommentInfo(getter),TypeError);assert.equal(getters,0);
const hidden={};Object.defineProperty(hidden,"win_message",{value:"hidden",enumerable:false});assert.throws(()=>parseArenaCommentInfo(hidden),TypeError);
assert.throws(()=>parseArenaCommentInfo({...current,[Symbol("extra")]:"x"}),TypeError);
assert.throws(()=>planArenaComments({start_message:"broken"} as typeof current,{}),TypeError,"No-op cannot launder corrupt retained state");
assert.deepEqual(planArenaComments(current,{start_message:" ",win_message:"None",lose_message:"Bad words unchanged"}).next,
  {start_message:" ",win_message:"None",lose_message:"Bad words unchanged"},"No unproved trim or profanity transformation");
console.log("Arena comment planning: partial JSON/native keys, full stored schema, Unicode/lossless/control bounds, first capture/default preservation, no-op and detached immutable updates passed; quotas/admission remain local.");
