// Original resource metadata only; never creates gameplay equipment references.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pins=JSON.parse(readFileSync(path.join(root,'resources/manifests/imported-files.json'),'utf8'));
const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._';
const packs=[];
for(const pin of pins.filter(pin=>/^resources\/runtime\/assets\/C\d{3}[A-Z]?_Q\.jet$/.test(pin.destination))) {
  const bytes=readFileSync(path.join(root,pin.destination));
  if(bytes.length!==pin.bytes || createHash('sha256').update(bytes).digest('hex')!==pin.sha256) throw new Error('Changed original equipment source '+pin.destination);
  let offset=0,recordCount=0;const records=[];
  while(offset<bytes.length) {
    if(offset+24>bytes.length) throw new Error('Truncated original JET header');
    const size=bytes.readUInt32LE(offset+8);
    if(size===0 || offset+24+size>bytes.length) throw new Error('Truncated original JET record');
    let id=bytes.readBigUInt64LE(offset+12),name='';
    while(id>0n){name=alphabet[Number(id%38n)]+name;id/=38n;}
    const match=/^(C\d{3}[A-Z]?)_(WEP|AMOR|ACCRY)$/.exec(name);
    if(match) {
      const payload=bytes.subarray(offset+24,offset+24+size);
      records.push({name,prefix:match[1],slot:{WEP:0,AMOR:1,ACCRY:2}[match[2]],headerOffset:offset,
        rawBytes:bytes.readUInt32LE(offset),packedBytes:size,headerFlags:bytes.readUInt32LE(offset+4),
        payloadSha256:createHash('sha256').update(payload).digest('hex')});
    }
    offset+=24+size;recordCount++;
  }
  if(records.length) packs.push({...pin,package:path.basename(pin.destination),recordCount,records});
}
packs.sort((a,b)=>a.package.localeCompare(b.package,'en'));
const output={kind:'RECOVERED resource metadata; not gameplay equipment references',
  method:'Original 24-byte JET records and base38 uint64 names, full EOF and original source hashes',
  nativeLookup:'SRGetResEquip G10ad7c4: supplied prefix + _WEP/_AMOR/_ACCRY',packs};
const target=path.join(root,'resources/reference/hunter-equipment-materials.json');
if(process.argv.includes('--write')) writeFileSync(target,JSON.stringify(output,null,2)+'\n');
else if(readFileSync(target,'utf8')!==JSON.stringify(output,null,2)+'\n') throw new Error('Equipment resource catalog differs from original inputs');
console.log(JSON.stringify({ownerPacks:packs.length,records:packs.reduce((count,pack)=>count+pack.records.length,0),written:process.argv.includes('--write')}));
