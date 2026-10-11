import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Contract for a separate original JET group, not E_NEW's multi-entry UI tree.
// The payload is checked against both manifest hashes and pinned original bytes.
export function verifySingleJet(bytes, row, pin, original) {
  assert.ok(Buffer.isBuffer(bytes) && Buffer.isBuffer(original));
  assert.equal(row.length,6,'Manifest record columns');
  assert.equal(row[0],pin.name.slice(0,-4),'Manifest group identity');
  assert.equal(row[3],'0','Manifest step field');
  assert.ok(bytes.length >= 29,'Truncated PKGI1 header/table');
  assert.equal(bytes.length,Number(row[2]),'Manifest package size');
  assert.equal(bytes.readUInt32LE(0),Number(row[1]),'PKGI1 stamp');
  assert.equal(bytes.readUInt32LE(4),0,'PKGI1 reserved word4');
  assert.equal(bytes.readUInt32LE(8),1,'Separate JET group entry count');
  assert.equal(bytes.readUInt32LE(12),0,'PKGI1 reserved word12');
  assert.equal(bytes.readUInt32LE(16),1,'PKGI1 repeated entry count');
  const length=bytes[20],tableEnd=21+length+8;
  assert.ok(length>0 && tableEnd<=bytes.length,'Truncated PKGI1 entry table');
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(21,21+length));
  assert.equal(name,pin.name,'Original JET entry name');
  const size=bytes.readUInt32LE(21+length),offset=bytes.readUInt32LE(25+length);
  assert.equal(offset,tableEnd,'Payload must begin exactly after its table');
  assert.equal(offset+size,bytes.length,'Payload must end exactly at package EOF');
  assert.equal(size,pin.bytes,'Original JET size');
  const payload=bytes.subarray(offset,offset+size);
  assert.deepEqual(payload,original,'Original JET bytes altered');
  assert.equal(crypto.createHash('sha256').update(payload).digest('hex'),pin.sha256,'Pinned original SHA256');
  assert.equal(crypto.createHash('md5').update(original).digest('hex'),row[4].toLowerCase(),'Manifest inner MD5');
  assert.equal(crypto.createHash('md5').update(bytes).digest('hex'),row[5].toLowerCase(),'Manifest outer MD5');
  return {name,originalBytes:size,packageBytes:bytes.length};
}
