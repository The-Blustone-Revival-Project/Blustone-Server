import assert from "node:assert/strict";
import {parseGuildInfoQuery} from "../src/guild-info-query.js";
assert.deepEqual(parseGuildInfoQuery({guild_id:"[1]"}),["1"]);
assert.deepEqual(parseGuildInfoQuery({guild_id:"[]"}),[]);
assert.deepEqual(parseGuildInfoQuery({guild_id:"[9007199254740993,18446744073709551615]"}),["9007199254740993","18446744073709551615"]);
assert.deepEqual(parseGuildInfoQuery({guild_id:'["9007199254740993"]'}),["9007199254740993"]);
for(const raw of [{},{guild_id:1},{guild_id:[1]},{guild_id:"1"},{guild_id:"{}"},{guild_id:"null"},
  {guild_id:"[0]"},{guild_id:"[-1]"},{guild_id:"[1.5]"},{guild_id:"[1,1]"},{guild_id:"[18446744073709551616]"},
  {guild_id:"[true]"},{guild_id:'["01"]'},{guild_id_list:"[1]"}]) assert.throws(()=>parseGuildInfoQuery(raw));
console.log("Guild detail query: singular guild_id JSON-array form, empty/single/batch exact uint64 parsing, malformed/duplicate/zero/overflow refusal passed; response INFO IDs remain uint32 publication gate.");
