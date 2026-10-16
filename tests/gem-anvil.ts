import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {repositoryPath} from "../src/paths.js";
import {GEM_ANVIL_SOURCE,originalGemAnvilRows,gemAnvilPreview,gemAnvilHeatStage} from "../src/gem-anvil.js";

const pack=readFileSync(repositoryPath(GEM_ANVIL_SOURCE.pack)),rows=originalGemAnvilRows(pack);
assert.equal(rows.length,14);assert.deepEqual(rows.map(row=>row.destination_level),Array.from({length:14},(_,i)=>i+2));
assert.deepEqual(rows.map(row=>row.increment_byte),[10,8,6,5,4,3,2,2,1,1,1,0,0,0]);
assert.equal(rows[2].increment_source,"6.4");assert.equal(rows[2].base_float32,64);
assert.equal(rows[13].base_float32,5.5);assert.equal(rows[13].increment_byte,0);
rows[0].base_float32=0;rows.pop();assert.equal(originalGemAnvilRows(pack)[0].base_float32,100);
assert.equal(gemAnvilPreview(pack,3,3).percentage_before_format,82,"Destination4:64 +3*truncated6, not83.2");
assert.equal(gemAnvilPreview(pack,14,999).percentage_before_format,5.5,"Destination15 increment0.6 becomes byte0");
assert.equal(gemAnvilPreview(pack,1,0xffff_ffff).product_signed32,-10);
assert.equal(gemAnvilPreview(pack,1,0xffff_ffff).percentage_before_format,90);
assert.equal(gemAnvilPreview(pack,1,0x8000_0000).product_signed32,0,"Word multiplication wraps before signed conversion");
assert.equal(gemAnvilPreview(pack,2,0x8000_0001).percentage_before_format,88);
assert.equal(gemAnvilPreview(pack,1,3355445).percentage_before_format,33554548,
  "Native product conversion rounds to float32 before base addition; a single final rounding gives33554552");
const missing=gemAnvilPreview(pack,0,1);assert.equal(missing.found,false);assert.equal(missing.increment_byte,255);
assert.equal(missing.percentage_before_format,255,"Native missing-row sentinel is not a fabricated zero chance");
assert.equal(gemAnvilPreview(pack,0xffff_ffff,0).destination_level,0);
assert.equal(gemAnvilPreview(pack,0x7fff_ffff,0).destination_level_signed,-0x8000_0000);
assert.equal(gemAnvilHeatStage(0),0);assert.equal(gemAnvilHeatStage(50),0.5);assert.equal(gemAnvilHeatStage(200),1);
assert.equal(gemAnvilHeatStage(-50),-0.5,"No unsupported native lower clamp");
for(const value of [-1,1.5,NaN,Infinity,0x1_0000_0000]) {
  assert.throws(()=>gemAnvilPreview(pack,value,0),TypeError);assert.throws(()=>gemAnvilPreview(pack,1,value),TypeError);
}
assert.throws(()=>gemAnvilHeatStage(Infinity),TypeError);
const bad=Buffer.from(pack);bad[3143]^=1;assert.throws(()=>originalGemAnvilRows(bad),/pin mismatch/);
assert.throws(()=>originalGemAnvilRows(pack.subarray(0,-1)),/pin mismatch/);
console.log("Original Gem anvil: pinned ANVILHEATED rows, destination lookup, float32 base/byte increment, wrapped signed failure-word math and separate heat clamp passed; no server odds/RNG/wallet integration.");
