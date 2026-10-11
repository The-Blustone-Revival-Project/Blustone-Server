import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifySingleJet} from '../scripts/resources/verify-single-jet.mjs';

// Authored fixture bytes test transport invariants, not original game content.
const original=Buffer.from('authored JET transport fixture');
const name='C011.jet',nameBytes=Buffer.from(name),tableEnd=29+nameBytes.length;
const bytes=Buffer.alloc(tableEnd+original.length);
bytes.writeUInt32LE(1634684,0);bytes.writeUInt32LE(1,8);bytes.writeUInt32LE(1,16);
bytes[20]=nameBytes.length;nameBytes.copy(bytes,21);
bytes.writeUInt32LE(original.length,21+nameBytes.length);
bytes.writeUInt32LE(tableEnd,25+nameBytes.length);original.copy(bytes,tableEnd);
const digest=(algorithm,data)=>crypto.createHash(algorithm).update(data).digest('hex');
const pin={name,bytes:original.length,sha256:digest('sha256',original)};
const row=['C011','1634684',String(bytes.length),'0',digest('md5',original),digest('md5',bytes)];
assert.deepEqual(verifySingleJet(bytes,row,pin,original),{name,originalBytes:original.length,packageBytes:bytes.length});
for(const [offset,value,label] of [[0,1634683,'stamp'],[4,1,'reserved'],[8,2,'count'],[12,1,'reserved'],[16,2,'count']]) {
  const bad=Buffer.from(bytes);bad.writeUInt32LE(value,offset);
  assert.throws(()=>verifySingleJet(bad,row,pin,original),undefined,label);
}
const overlap=Buffer.from(bytes);overlap.writeUInt32LE(tableEnd-1,25+nameBytes.length);
assert.throws(()=>verifySingleJet(overlap,row,pin,original),/exactly after/);
const beyond=Buffer.from(bytes);beyond.writeUInt32LE(original.length+1,21+nameBytes.length);
assert.throws(()=>verifySingleJet(beyond,row,pin,original),/EOF/);
const trailing=Buffer.concat([bytes,Buffer.from([0])]);const trailingRow=[...row];trailingRow[2]=String(trailing.length);
assert.throws(()=>verifySingleJet(trailing,trailingRow,pin,original),/EOF/);
const wrongName=Buffer.from(bytes);wrongName[21]=88;
assert.throws(()=>verifySingleJet(wrongName,row,pin,original),/entry name/);
const truncatedName=Buffer.from(bytes);truncatedName[20]=255;
assert.throws(()=>verifySingleJet(truncatedName,row,pin,original),/Truncated/);
assert.throws(()=>verifySingleJet(Buffer.alloc(19),row,pin,original),/Truncated/);
const changedOriginal=Buffer.from(original);changedOriginal[0]^=1;
assert.throws(()=>verifySingleJet(bytes,row,pin,changedOriginal),/bytes altered/);
assert.throws(()=>verifySingleJet(bytes,row,{...pin,sha256:'0'.repeat(64)},original),/SHA256/);
for(const index of [0,3,4,5]) {
  const bad=[...row];bad[index]=index<4?'wrong':'0'.repeat(32);
  assert.throws(()=>verifySingleJet(bytes,bad,pin,original));
}
assert.throws(()=>verifySingleJet(bytes,row.slice(0,5),pin,original),/columns/);
console.log('Original JET package verifier: header, exact identity, contiguous table/payload, EOF, byte/hash corruption refusals passed');
