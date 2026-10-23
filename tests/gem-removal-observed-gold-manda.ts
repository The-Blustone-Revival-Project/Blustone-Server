import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {repositoryPath} from "../src/paths.js";
import {gemRemovalPrices,gemRemovalPriceAt} from "../src/gem-removal-prices.js";

const bytes=(p:string)=>readFileSync(repositoryPath(p));
const json=(p:string)=>JSON.parse(bytes(p).toString("utf8"));
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const raw=json("config/policies/gem-removal-observed-gold-manda.json"),original=structuredClone(raw);
const metadata=json("config/policies/gem-removal-observed-gold-manda.provenance.json"),basePath=metadata.base_provenance.path;
assert.equal(basePath,"config/policies/gem-removal-observed-gold.provenance.json");
assert.equal(sha(bytes(basePath)),metadata.base_provenance.sha256);
const base=json(basePath),quotes=gemRemovalPrices({result_code:1,ret_data:raw});
const expected=[[1,2,2500],[6,15,15000],[7,17,17500],[15,40,40000]];
assert.deepEqual(quotes,expected.flatMap(([level,manda,gold])=>[
  {level,price_type:1,price:manda},{level,price_type:2,price:gold}]));
assert.deepEqual(quotes.filter(row=>row.price_type===2),json("config/policies/gem-removal-observed-gold.json"),"existing gold-only dataset must remain exact");
assert.deepEqual(metadata.observations.map((q:{index:number;level:number;manda1:number;gold2:number})=>[q.index,q.level,q.manda1,q.gold2]),
  [[815,1,2,2500],[1336,1,2,2500],[889,6,15,15000],[599,7,17,17500],[3543,15,40,40000]]);
for(const observation of metadata.observations) {
  const source=base.quotes.filter((q:{index:number})=>q.index===observation.index);assert.equal(source.length,1);
  const quote=source[0];assert.equal(sha(quote.raw_tsv_row),observation.raw_row_sha256);assert.equal(quote.raw_row_sha256,observation.raw_row_sha256);
  assert.equal(quote.level,observation.level);assert.equal(quote.price,observation.gold2);
  // These numbers are literal secondary remove-cost observations, not ratios
  // calculated from gold. The old complete raw row is already source pinned.
  const cost=quote.raw_tsv_row.split("\t")[10].match(/(?:remove(?:[- ]cost)?|Required Cost for Remove)[= ]+(\d+)(?: (?:gold|rupees|coin))? ?\/ ?(\d+)/i);
  assert.ok(cost,`missing exact observed cost pair for idx${quote.index}`);
  assert.equal(Number(cost[1]),observation.gold2);assert.equal(Number(cost[2]),observation.manda1);
  assert.equal(gemRemovalPriceAt(quotes,observation.level,1)?.price,observation.manda1);
  assert.equal(gemRemovalPriceAt(quotes,observation.level,2)?.price,observation.gold2);
  assert.equal(quote.screenshot_sha256,null,"a reused transcription must not claim new screenshot verification");
}
for(const level of [0,2,3,4,5,8,9,10,11,12,13,14,16])for(const payment of [1,2])assert.equal(gemRemovalPriceAt(quotes,level,payment),undefined);
for(const [level] of expected)for(const payment of [0,3,4,9])assert.equal(gemRemovalPriceAt(quotes,level,payment),undefined);
assert.notEqual(gemRemovalPriceAt(quotes,7,1)?.price,gemRemovalPriceAt(quotes,7,2)!.price/1000,"displayed17 must not become17.5");
assert.notEqual(gemRemovalPriceAt(quotes,15,1)?.price,15*2.5,"missing levels and level15 must not be interpolated");
assert.throws(()=>gemRemovalPrices({result_code:1,ret_data:[...raw,{level:7,price_type:1,price:18}]}),/Duplicate/);
assert.throws(()=>gemRemovalPrices({result_code:1,ret_data:[{level:7,price_type:1,price:17.5}]}),/uint32/);
assert.deepEqual(raw,original);
console.log("Observed dual-payment Gem removal: eight exact rows, five reused pinned anchors, gold-only exact, no ratio/interpolation/type4 or screenshot claim PASS");
