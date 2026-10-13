import assert from "node:assert/strict";
import {parseGuildRankingQuery} from "../src/guild-ranking-query.js";
assert.deepEqual(parseGuildRankingQuery({page:"0",size:"10"}),{page:0,size:10},"original first native page");
assert.deepEqual(parseGuildRankingQuery({page:"1",size:"10"}),{page:1,size:10},"original pull increments page rather than supplying rank offset");
assert.deepEqual(parseGuildRankingQuery({page:0,size:10}),{page:0,size:10},"explicit numeric replica admission");
assert.deepEqual(parseGuildRankingQuery({page:"2147483647",size:"2147483647"}),{page:0x7fff_ffff,size:0x7fff_ffff});
for(const raw of [null,[],{}, {page:"0"},{size:"10"},
  {page:"-1",size:"10"},{page:"0",size:"0"},{page:"01",size:"10"},
  {page:"0",size:"10.0"},{page:"0.5",size:"10"},{page:"2147483648",size:"10"},
  {page:"0",size:"2147483648"},{page:Infinity,size:10},{page:0,size:NaN},
  {page:[0],size:10},{page:"1e0",size:10}]) assert.throws(()=>parseGuildRankingQuery(raw));
const raw={page:"0",size:"10",pvid:1,otp:"AUTHORED"},copy=structuredClone(raw);
parseGuildRankingQuery(raw);assert.deepEqual(raw,copy,"query parsing does not mutate auth or invent ranking data");
console.log("Guild ranking query: original zero-based page/size10 form, explicit signed32 widths, malformed/missing/overflow refusal and input preservation passed; rankings/rewards remain unconfigured.");
