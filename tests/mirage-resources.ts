import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {MIRAGE_RESOURCE_SOURCES,MIRAGE_ENVIRONMENT_SOURCE,originalMirageResourceIndex,originalMirageEnvironments} from "../src/mirage-resources.js";

const python=process.env.PYTHON??"python";
const units=spawnSync(python,["tests/test_jet_index.py"],{encoding:"utf8"});
assert.equal(units.status,0,units.error?.message??units.stderr);
for(const kind of ["mirage","st002"] as const) {
  const pin=MIRAGE_RESOURCE_SOURCES[kind],pack=readFileSync(pin.pack),index=readFileSync(pin.index);
  const regenerated=spawnSync(python,["scripts/resources/jet-index.py",pin.pack],{encoding:"utf8",maxBuffer:2*1024*1024});
  assert.equal(regenerated.status,0,regenerated.error?.message??regenerated.stderr);
  assert.deepEqual(JSON.parse(regenerated.stdout),JSON.parse(index.toString("utf8")),"Independent decoder must reproduce pinned original report");
  const resources=originalMirageResourceIndex(kind,pack,index);
  assert.equal(resources.size,pin.resources);
  for(const row of resources.values())if(row.s2projection?.supported) {
    const image=resources.get(row.s2projection.image_name!);
    assert.ok(image);assert.equal(image.payload_prefix_hex,"4932");
    assert.equal(row.s2projection.image_encoded_name,image.encoded_name);
    assert.equal(row.s2projection.image_sha256,image.sha256);
  }
  const badPack=Buffer.from(pack);badPack[24]^=1;
  assert.throws(()=>originalMirageResourceIndex(kind,badPack,index),/pin mismatch/);
  const badIndex=Buffer.from(index);badIndex[10]^=1;
  assert.throws(()=>originalMirageResourceIndex(kind,pack,badIndex),/pin mismatch/);
  resources.values().next().value!.name="MUTATED";resources.clear();
  assert.equal(originalMirageResourceIndex(kind,pack,index).size,pin.resources);
}
const pin=MIRAGE_RESOURCE_SOURCES.mirage;
const mirage=originalMirageResourceIndex("mirage",readFileSync(pin.pack),readFileSync(pin.index));
assert.equal([...mirage.values()].filter(row=>row.s2projection?.supported).length,30);
assert.ok(mirage.get("MRG002")?.s2projection?.supported);
assert.equal(mirage.get("BG_M_INGAME")!.encoded_name,"71867286279748010","Full64 original name cannot be rounded through Number");
assert.equal(mirage.has("002"),false,"Background selector is not a resource name");
const envBytes=readFileSync(MIRAGE_ENVIRONMENT_SOURCE.path),env=originalMirageEnvironments(envBytes);
assert.equal(env.size,50);
assert.deepEqual([...env].filter(([,prefix])=>prefix.match(/[0-9]+/)?.[0]==="002").map(([id])=>id),["2","15"]);
env.clear();assert.equal(originalMirageEnvironments(envBytes).size,50);
assert.throws(()=>originalMirageEnvironments(Buffer.concat([envBytes,Buffer.from("\n")])),/pin mismatch/);
console.log("Original Mirage resources: pinned MIRAGE/ST002, reproduced base38 full64/chunk/S2 image indexes, 30 original sprite bindings, exact ENV keys2/15 and corruption refusal passed; no floor or live deployment claim.");
