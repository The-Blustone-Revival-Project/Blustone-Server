import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {repositoryPath} from "../src/paths.js";
import {MIRAGE_BACKGROUND_SOURCE,originalMirageBackgroundPrefixes,originalMirageLayerRecipe,originalMirageLayerDependencies} from "../src/mirage-backgrounds.js";
import {MIRAGE_RESOURCE_SOURCES,MIRAGE_ENVIRONMENT_SOURCE,originalMirageResourceIndex} from "../src/mirage-resources.js";

const leveling=readFileSync(repositoryPath(MIRAGE_BACKGROUND_SOURCE.pack));
assert.deepEqual(originalMirageBackgroundPrefixes(leveling),{longlong:"D",long:"C",short:"B",shortshort:"A",window:"E"});
const altered=originalMirageBackgroundPrefixes(leveling);altered.long="WRONG";
assert.equal(originalMirageBackgroundPrefixes(leveling).long,"C","Returned prefixes cannot rewrite cached provenance");
const pin=MIRAGE_RESOURCE_SOURCES.st002;
const resources=originalMirageResourceIndex("st002",readFileSync(repositoryPath(pin.pack)),readFileSync(repositoryPath(pin.index)));
const environments=readFileSync(repositoryPath(MIRAGE_ENVIRONMENT_SOURCE.path));
const before=JSON.stringify([...resources]);
const first=originalMirageLayerRecipe("2",leveling,environments,resources),second=originalMirageLayerRecipe("15",leveling,environments,resources);
assert.deepEqual(first.layers,second.layers,"Both original candidates have identical layer recipes");
assert.deepEqual(first.layers.map(row=>row.required[0].name),["STI002_D1","STI002_C1","STI002_B1","STI002_A1","STI002_E1"]);
assert.deepEqual(first.layers.map(row=>row.sequence.length),[2,2,2,3,2]);
assert.ok(first.layers.every(row=>row.sequence.every(name=>name===row.required[0].name)),"Decimal111 repeats variant1; does not invent variants2/3");
assert.equal(JSON.stringify([...resources]),before,"Recipe does not mutate supplied verified index");
first.layers[0].sequence[0]="MUTATED";first.layers[0].required[0].name="MUTATED";
assert.equal(originalMirageLayerRecipe("2",leveling,environments,resources).layers[0].sequence[0],"STI002_D1");
for(const id of ["002","02","0","foreign"])assert.throws(()=>originalMirageLayerRecipe(id,leveling,environments,resources),/Only original/);
const missing=new Map(resources);missing.delete("STI002_A1");assert.throws(()=>originalMirageLayerRecipe("2",leveling,environments,missing),/AT name\/type/);
const wrongType=new Map(resources);wrongType.set("STI002_A1",{...resources.get("STI002_A1")!,payload_prefix_hex:"5332"});
assert.throws(()=>originalMirageLayerRecipe("2",leveling,environments,wrongType),/AT name\/type/);
const bad=Buffer.from(leveling);bad[3393]^=1;assert.throws(()=>originalMirageBackgroundPrefixes(bad),/pin mismatch/);
assert.throws(()=>originalMirageBackgroundPrefixes(leveling.subarray(0,-1)),/pin mismatch/);
assert.throws(()=>originalMirageLayerRecipe("2",leveling,Buffer.concat([environments,Buffer.from("\n")]),resources),/pin mismatch/);
const pack=readFileSync(repositoryPath(pin.pack)),index=readFileSync(repositoryPath(pin.index));
const dependencies=originalMirageLayerDependencies("2",leveling,environments,pack,index);
assert.deepEqual(dependencies.layers,originalMirageLayerDependencies("15",leveling,environments,pack,index).layers);
assert.deepEqual(dependencies.layers.map(layer=>layer.required[0].frames[0].sprite.name),
  ["STI002_D01","STI002_C01","STI002_B01","STI002_A01","STI002_E01"]);
assert.ok(dependencies.layers.every(layer=>layer.required.every(animation=>animation.frames.length===1&&
  animation.frames[0].duration===0.5&&animation.frames[0].image.decoded_bytes>0)));
assert.deepEqual(dependencies.layers.map(layer=>layer.required[0].frames[0].image.name),
  ["M7UX9J","NQK6.I","13I5AHF","M4M5EK","M7UX9J"],"Original D/E layers share an image; do not invent distinct textures");
dependencies.layers[0].required[0].frames[0].image.name="MUTATED";
assert.notEqual(originalMirageLayerDependencies("2",leveling,environments,pack,index).layers[0].required[0].frames[0].image.name,"MUTATED");
const corruptedPack=Buffer.from(pack);corruptedPack[24]^=1;
assert.throws(()=>originalMirageLayerDependencies("2",leveling,environments,corruptedPack,index),/pin mismatch/);
assert.throws(()=>originalMirageLayerDependencies("2",leveling,environments,pack,Buffer.concat([index,Buffer.from("\n")])),/pin mismatch/);
console.log("Original Mirage layer recipes/dependencies: pinned LEVELING COMMON/RW/BOM JSON, exact D/C/B/A/E suffixes, ENV2/15 repetitions and all five original AT→S2→I2 chains passed; no native rendering or run publication claim.");
