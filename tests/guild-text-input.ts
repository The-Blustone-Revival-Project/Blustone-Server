import assert from "node:assert/strict";
import {guildTextInput,GUILD_EDIT_INPUT_LIMITS,guildFcPointLimit,GUILD_FC_POINT_LIMITS} from "../src/guild-text-input.js";
assert.deepEqual(GUILD_EDIT_INPUT_LIMITS,{name:14,desc:80});
assert.equal(guildTextInput("name","A".repeat(14)).max_characters,14);
assert.throws(()=>guildTextInput("name","A".repeat(15)),/limit/);
assert.equal(guildTextInput("name","가".repeat(8)).characters,8);
assert.throws(()=>guildTextInput("name","가".repeat(9)),/limit/);
assert.equal(guildTextInput("name","A".repeat(7)+"가").max_characters,8,"one non-ASCII character reduces the entire field budget");
assert.throws(()=>guildTextInput("name","A".repeat(8)+"가"),/limit/);
assert.equal(guildTextInput("name","😀".repeat(8)).characters,8,"count UTF8 leading bytes/code points, not JS UTF16 units");
assert.equal(guildTextInput("desc","A".repeat(80)).max_characters,80);
assert.throws(()=>guildTextInput("desc","A".repeat(81)),/limit/);
assert.equal(guildTextInput("desc","가".repeat(40)).max_characters,40);
assert.throws(()=>guildTextInput("desc","가".repeat(41)),/limit/);
assert.equal(guildTextInput("name","e\u0301".repeat(4)).characters,8,"count code points, not displayed grapheme clusters");
assert.equal(guildTextInput("name","").characters,0,"length-only evidence does not invent minimum-name validity");
assert.throws(()=>guildTextInput("name","\ud800"),/UTF8/);
assert.throws(()=>guildTextInput("desc","A\0B"),/NUL/);
assert.throws(()=>guildTextInput("name",1),/UTF8/);
assert.throws(()=>guildTextInput("region" as any,"A"),/field/);
assert.deepEqual(GUILD_FC_POINT_LIMITS,{minimum:0,maximum:4000,unit:500});
for(const count of [0,500,1000,1500,2000,2500,3000,3500,4000]) {
  assert.equal(guildFcPointLimit(count),count);assert.equal(guildFcPointLimit(String(count)),count);
}
for(const value of [-1,1,499,4001,4500,"01","500.0",1.5,null,undefined]) assert.throws(()=>guildFcPointLimit(value));
console.log("Guild edit text: native14/80 limits, any-non-ASCII half/floor8, UTF8 code-point counts, boundary/encoding refusal passed; complete creation and font/bad-word gates remain unknown.");
