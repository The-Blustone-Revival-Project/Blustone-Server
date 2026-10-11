// Original Gem artwork catalogue only. Never derive gameplay IDs or rolls.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pins=JSON.parse(readFileSync(path.join(root,'resources/manifests/imported-files.json'),'utf8'));
const names=['GEM.jet','UI_GEM.jet','GEM_EFT.jet','GEM_CHA.jet','GEM_SELECT.jet','MP4_GEM.jet','E_GEM_DEFALT.jet'];
const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._';
const packs=[];
for(const name of names) {
  const destination='resources/runtime/assets/'+name;
  const pin=pins.find(pin=>pin.destination===destination);
  if(!pin) throw new Error('Missing original Gem pack pin '+name);
  const bytes=readFileSync(path.join(root,destination));
  if(bytes.length!==pin.bytes||createHash('sha256').update(bytes).digest('hex')!==pin.sha256) throw new Error('Changed original Gem pack '+name);
  const records=[];let offset=0;
  while(offset<bytes.length) {
    if(offset+24>bytes.length) throw new Error('Truncated Gem JET header');
    const size=bytes.readUInt32LE(offset+8);
    if(!size||offset+24+size>bytes.length) throw new Error('Truncated Gem JET payload');
    let id=bytes.readBigUInt64LE(offset+12),record='';
    while(id>0n){record=alphabet[Number(id%38n)]+record;id/=38n;}
    const match=/^G_([123])_(\d{3})_R([1-5])$/.exec(record);
    records.push({name:record,headerOffset:offset,rawBytes:bytes.readUInt32LE(offset),packedBytes:size,
      headerFlags:bytes.readUInt32LE(offset+4),payloadSha256:createHash('sha256').update(bytes.subarray(offset+24,offset+24+size)).digest('hex'),
      ...(match?{gemArtwork:{wireTarget:Number(match[1]),artOrdinal:match[2],rank:Number(match[3])}}:{})});
    offset+=24+size;
  }
  packs.push({...pin,package:name,recordCount:records.length,records});
}
const output={kind:'RECOVERED original Gem resource records; not reference IDs, owned rolls or pools',
  method:'SHA-pinned imported originals; 24-byte record headers; uint64 base38 names; exact EOF',
  packs:packs.sort((a,b)=>a.package.localeCompare(b.package,'en'))};
const target=path.join(root,'resources/reference/gem-materials.json');
const serialized=JSON.stringify(output,null,2)+'\n';
if(process.argv.includes('--write')) writeFileSync(target,serialized);
else if(readFileSync(target,'utf8')!==serialized) throw new Error('Gem catalogue differs from original bytes');
console.log(JSON.stringify({packs:packs.length,records:packs.reduce((sum,p)=>sum+p.recordCount,0),rankArtwork:packs.flatMap(p=>p.records).filter(r=>r.gemArtwork).length,written:process.argv.includes('--write')}));
