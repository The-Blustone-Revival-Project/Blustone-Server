import {readFileSync,existsSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
function stamp(value) {
  if(typeof value!=='string'||!/^[1-9][0-9]*$/.test(value)||Number(value)>0x7fffffff)
    throw new Error('Guild profile stamp exceeds positive signed32 local policy');
  return Number(value);
}

// Resource readiness only: no account, membership, price or live activation.
export function prepareGuildProfile(profile,{resourceRoot=root,originals,baselineNames}={}) {
  const pins=originals??JSON.parse(readFileSync(path.join(resourceRoot,'resources/manifests/guild-originals.json'),'utf8'));
  if(!Array.isArray(pins)||pins.length!==1||pins[0].name!=='GUILD.jet') throw new Error('Invalid Guild original pin');
  const pin=pins[0],env=profile?.env;
  const baseline=baselineNames??JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6-materials.json'),'utf8')).env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(!env||typeof env.BLUSTONE_PACKAGE_NAMES!=='string') throw new Error('Missing Guild baseline');
  const names=env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(baseline.length!==139||new Set(names).size!==names.length||profile.expectedPackages!==names.length||
    names.slice(0,139).join(',')!==baseline.join(',')||![139,140].includes(names.length)||
    (names.length===140&&names[139]!=='GUILD.jet')) throw new Error('Restore exact E6 baseline before Guild preparation');
  if(env.BLUSTONE_RESOURCE_ASSET_NAMES!==','||env.BLUSTONE_RESOURCE_ASSET_GLOB||env.BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA)
    throw new Error('Guild requires separate original package groups');
  const stamps=stampKeys.map(key=>stamp(env[key]));
  if(profile.resourceStamp!==undefined) stamps.push(stamp(profile.resourceStamp));
  const next=Math.max(1634686,Math.max(...stamps)+(names.length===139?1:0));
  if(next>0x7fffffff) throw new Error('Guild profile stamp overflow');
  if(!Number.isSafeInteger(pin.bytes)||pin.bytes<=0||!/^[a-f0-9]{64}$/.test(pin.sha256)) throw new Error('Invalid Guild original fingerprint');
  let found=false;
  for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_RESOURCE_ASSET_DIR']) {
    if(typeof env[key]!=='string') throw new Error('Missing Guild resource directory');
    const file=path.resolve(resourceRoot,env[key],pin.name);
    if(!existsSync(file)) continue;
    found=true;
    if(!statSync(file).isFile()||statSync(file).size!==pin.bytes||createHash('sha256').update(readFileSync(file)).digest('hex')!==pin.sha256)
      throw new Error('Guild original missing or conflicting bytes');
  }
  if(!found) throw new Error('Guild original is missing');
  const candidate=structuredClone(profile);
  Object.assign(candidate,{name:'current-e6-guild',source:'Prepared original Guild artwork; membership/fees/GvG remain unreconstructed',
    preparedOnly:true,expectedPackages:140,resourceStamp:String(next)});
  candidate.env.BLUSTONE_PACKAGE_NAMES=[...baseline,'GUILD.jet'].join(',');
  for(const key of stampKeys) candidate.env[key]=String(next);
  return candidate;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')) throw new Error('Usage: prepare-guild.mjs [--inspect-only]');
  const candidate=prepareGuildProfile(JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6-materials.json'),'utf8')));
  const text=JSON.stringify(candidate,null,2)+'\n';
  if(process.argv.includes('--inspect-only')) console.log(text);
  else {
    const file=path.join(root,'config/profiles/current-e6-guild.json');
    if(existsSync(file)) {if(readFileSync(file,'utf8')!==text) throw new Error('Existing Guild candidate differs; no overwrite or stamp regression');}
    else writeFileSync(file,text,{flag:'wx'});
    console.log('Prepared inactive Guild profile:140 packages/stamp'+candidate.resourceStamp);
  }
}
