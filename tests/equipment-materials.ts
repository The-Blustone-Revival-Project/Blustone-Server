import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {repositoryPath} from "../src/paths.js";
import {equipmentMaterialCoverage} from "../src/equipment-materials.js";

const metadata=JSON.parse(readFileSync(repositoryPath("resources/reference/hunter-equipment-materials.json"),"utf8"));
const pins=JSON.parse(readFileSync(repositoryPath("resources/manifests/imported-files.json"),"utf8"));
assert.equal(metadata.packs.length,150);
assert.equal(metadata.packs.reduce((count:number,pack:any)=>count+pack.records.length,0),450);
const alphabet="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._";
for(const pack of metadata.packs) {
  const pin=pins.find((row:any)=>row.destination===pack.destination);
  assert.deepEqual([pack.source,pack.bytes,pack.sha256],[pin.source,pin.bytes,pin.sha256]);
  const bytes=readFileSync(repositoryPath(pack.destination));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),pack.sha256);
  assert.deepEqual(pack.records.map((row:any)=>row.slot).sort(),[0,1,2]);
  for(const record of pack.records) {
    let encoded=0n;
    for(const char of record.name) encoded=encoded*38n+BigInt(alphabet.indexOf(char));
    assert.equal(bytes.readBigUInt64LE(record.headerOffset+12),encoded,"metadata names must encode the actual original ID");
    assert.equal(bytes.readUInt32LE(record.headerOffset),record.rawBytes);
    assert.equal(bytes.readUInt32LE(record.headerOffset+8),record.packedBytes);
    const payload=bytes.subarray(record.headerOffset+24,record.headerOffset+24+record.packedBytes);
    assert.equal(payload.length,record.packedBytes);
    assert.equal(createHash("sha256").update(payload).digest("hex"),record.payloadSha256);
  }
}
const current=equipmentMaterialCoverage("C001",["C001_Q.jet"]);
assert.deepEqual(current.map(row=>row.name),["C001_WEP","C001_AMOR","C001_ACCRY"]);
assert.ok(current.every(row=>row.originalSpriteKnown && row.selectedOwner && !row.nativeRenderingVerified));
assert.ok(current.every(row=>row.originalStats==="UNKNOWN" && row.originalReferenceId==="UNKNOWN"));
assert.ok(equipmentMaterialCoverage("C001",["C001.jet"]).every(row=>!row.selectedOwner),"main body selection does not select equipment Q owner");
assert.ok(equipmentMaterialCoverage("C999").every(row=>!row.originalSpriteKnown));
assert.ok(equipmentMaterialCoverage("001").every(row=>!row.originalSpriteKnown),"catalogue ID is not an implicit draw prefix");
current[0].owners[0].record.name="changed";
assert.equal(equipmentMaterialCoverage("C001")[0].owners[0].record.name,"C001_WEP");
const check=spawnSync(process.execPath,["scripts/resources/catalog-equipment.mjs"],{cwd:repositoryPath(),encoding:"utf8",timeout:20000});
assert.equal(check.status,0,check.stderr);
console.log("Equipment materials: 150 pinned owners/450 exact records, independent original name encodings/payload hashes, selected-package distinction and nonmutation passed; native pixels/stats unknown.");
