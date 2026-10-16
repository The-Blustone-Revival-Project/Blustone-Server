import {readFileSync, existsSync, statSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const required=[
  ['LEVELING.jet',18524,'ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e'],
  ['ST002.jet',2985916,'e75a9e7be84632e960a3084e4262726604c013d96633c3015d125f9ada9129ba'],
  ['MIRAGE.jet',3861142,'d2cf0adca895de1174f35f507cf5e38a21b8e74572a5c895c50ad6c062f4374e'],
];
function stamp(value) {
  if(typeof value!=='string'||!/^[1-9][0-9]*$/.test(value)||Number(value)>0x7fffffff)
    throw new Error('Mirage profile stamp exceeds positive signed32 local policy');
  return Number(value);
}

// Asset preparation only. This neither creates a Mirage run nor activates a profile.
export function prepareMirageProfile(profile,{resourceRoot=root,originals}={}) {
  const pins=originals===undefined?JSON.parse(readFileSync(path.join(resourceRoot,'resources/manifests/mirage-originals.json'),'utf8')):originals;
  if(!Array.isArray(pins)||pins.length!==required.length||required.some(([name,bytes,sha256],i)=>
    !pins[i]||pins[i].name!==name||pins[i].bytes!==bytes||pins[i].sha256!==sha256||
    pins[i].destination!==`resources/runtime/assets/${name}`||
    pins[i].source!==`recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/${name}`))
    throw new Error('Invalid Mirage original pins');
  const baseline=JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6-materials.json'),'utf8')).env.BLUSTONE_PACKAGE_NAMES.split(',');
  const env=profile?.env;
  if(!env||typeof env.BLUSTONE_PACKAGE_NAMES!=='string') throw new Error('Missing Mirage baseline');
  const names=env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(baseline.length!==139||!baseline.includes('LEVELING.jet')||!baseline.includes('ST002.jet')||baseline.includes('MIRAGE.jet')||
    new Set(names).size!==names.length||profile.expectedPackages!==names.length||
    names.slice(0,139).join(',')!==baseline.join(',')||![139,140].includes(names.length)||
    (names.length===140&&names[139]!=='MIRAGE.jet')) throw new Error('Restore exact E6 baseline before Mirage preparation');
  if(env.BLUSTONE_RESOURCE_ASSET_NAMES!==','||env.BLUSTONE_RESOURCE_ASSET_GLOB||env.BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA)
    throw new Error('Mirage requires separate original package groups');
  const stamps=stampKeys.map(key=>stamp(env[key]));
  if(profile.resourceStamp!==undefined) stamps.push(stamp(profile.resourceStamp));
  const next=Math.max(1634687,Math.max(...stamps)+(names.length===139?1:0));
  if(next>0x7fffffff) throw new Error('Mirage profile stamp overflow');
  for(const pin of pins) {
    let found=false;
    for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_RESOURCE_ASSET_DIR']) {
      if(typeof env[key]!=='string'||!env[key]) throw new Error('Missing Mirage resource directory');
      const file=path.resolve(resourceRoot,env[key],pin.name);
      if(!existsSync(file)) continue;
      found=true;
      if(!statSync(file).isFile()||statSync(file).size!==pin.bytes||createHash('sha256').update(readFileSync(file)).digest('hex')!==pin.sha256)
        throw new Error(`Mirage original missing or conflicting bytes: ${pin.name}`);
    }
    if(!found) throw new Error(`Mirage original is missing: ${pin.name}`);
  }
  const candidate=structuredClone(profile);
  Object.assign(candidate,{name:'current-e6-mirage',source:'Prepared original Mirage artwork and pinned LEVELING/ST002 prerequisites; no playable run or original floor policy implied',
    preparedOnly:true,expectedPackages:140,resourceStamp:String(next)});
  candidate.env.BLUSTONE_PACKAGE_NAMES=[...baseline,'MIRAGE.jet'].join(',');
  for(const key of stampKeys) candidate.env[key]=String(next);
  return candidate;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')) throw new Error('Usage: prepare-mirage.mjs [--inspect-only]');
  const candidate=prepareMirageProfile(JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6-materials.json'),'utf8')));
  const text=JSON.stringify(candidate,null,2)+'\n';
  if(process.argv.includes('--inspect-only')) console.log(text);
  else {
    const file=path.join(root,'config/profiles/current-e6-mirage.json');
    if(existsSync(file)) {if(readFileSync(file,'utf8')!==text) throw new Error('Existing Mirage candidate differs; no overwrite or stamp regression');}
    else writeFileSync(file,text,{flag:'wx'});
    console.log('Prepared inactive Mirage profile:140 packages/stamp'+candidate.resourceStamp);
  }
}
