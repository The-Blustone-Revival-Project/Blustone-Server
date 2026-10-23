import {existsSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {restorationOriginals} from './prepare-restoration.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const maxStamp=2147483647;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJson=name=>JSON.parse(readFileSync(path.join(repoRoot,name),'utf8'));
export const E8_ORIGINAL_NAMES=Object.freeze(['C052.jet','C052_EFT.jet','C052_Q.jet','C052_SND.jet',
  'C056.jet','C056_EFT.jet','C056_Q.jet','C056_SND.jet','N008.jet','N008_BG.jet','ST007.jet','ST900.jet','CUT_E0601.jet','CUT_N9.jet']);
export const E8_MANIFEST_SHA256='e47f47c84ece43d4b60389c37fced6701d0d2ce03469380fdb22d7cb854e5422';

/** Text pin tolerates checkout LF/CRLF only. Original payload hashes below are
 * always checked over exact binary bytes. This never accesses a private source. */
export function episode08Originals() {
  const text=readFileSync(path.join(repoRoot,'resources/manifests/episode08-originals.json'),'utf8');
  if(sha(Buffer.from(text.replace(/\r\n/g,'\n')))!==E8_MANIFEST_SHA256)throw new Error('E8 original manifest pin mismatch');
  const rows=JSON.parse(text);
  if(!Array.isArray(rows)||!isDeepStrictEqual(rows.map(row=>row.name),E8_ORIGINAL_NAMES))throw new Error('Invalid E8 original manifest order');
  return rows;
}
function stamp(raw,label) {
  if(typeof raw!=='string'||!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>maxStamp)
    throw new Error(`Invalid ${label}: preparation requires positive signed32 stamps`);
  return Number(raw);
}
function profileStamps(profile) {
  const values=stampKeys.map(key=>stamp(profile?.env?.[key],key));
  const declared=profile?.resourceStamp===undefined?values[0]:stamp(profile.resourceStamp,'declared resourceStamp');
  if(values.some(value=>value!==declared))throw new Error('Incoherent profile stamps');
  return values;
}
function peerProfiles() {
  return readdirSync(path.join(repoRoot,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!=='current-e8.json')
    .map(name=>readJson('config/profiles/'+name));
}

/** Pure inactive continuation of the reviewed169-group restoration selection.
 * Resource root/source profiles are injectable for isolated corruption tests.
 * No source profile, payload, server, environment or saved account is mutated. */
export function prepareE8Profile(profile,{resourceRoot=repoRoot,sourceProfiles=peerProfiles(),originals=episode08Originals(),
  ledger=readJson('resources/manifests/imported-files.json')}={}) {
  const baseline=readJson('config/profiles/current-restoration.json'),baseNames=baseline.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(baseNames.length!==169||new Set(baseNames).size!==169||baseline.expectedPackages!==169)
    throw new Error('Restore the reviewed169-group source profile');
  stamp(profile?.resourceStamp,'declared E8 source resourceStamp');
  const sourceStamps=[baseline,...sourceProfiles].flatMap(profileStamps),ownStamps=profileStamps(profile);
  const env=profile.env;
  if(!env||typeof env.BLUSTONE_PACKAGE_NAMES!=='string')throw new Error('Missing complete E8 baseline package list');
  const names=env.BLUSTONE_PACKAGE_NAMES.split(','),allNames=[...baseNames,...E8_ORIGINAL_NAMES];
  const isBaseline=isDeepStrictEqual(names,baseNames),isComplete=isDeepStrictEqual(names,allNames);
  if((!isBaseline&&!isComplete)||profile.expectedPackages!==names.length||new Set(allNames).size!==183)
    throw new Error('E8 requires exact ordered169 baseline or183 completed selection');
  const neutralEnv=raw=>Object.fromEntries(Object.entries(raw).filter(([key])=>!stampKeys.includes(key)&&key!=='BLUSTONE_PACKAGE_NAMES'));
  if(!isDeepStrictEqual(neutralEnv(env),neutralEnv(baseline.env)))throw new Error('E8 must retain every reviewed baseline setting');
  const canonical=episode08Originals();
  if(!isDeepStrictEqual(originals,canonical))throw new Error('E8 original inventory differs from pinned source');
  if(!Array.isArray(ledger))throw new Error('Invalid original import ledger');
  // Retain the reviewed32 prior additions/prerequisites as well as the new14.
  // A corrupted prior original must not become an apparently ready E8 profile.
  for(const pin of [...restorationOriginals(),...originals]) {
    const imported=ledger.filter(row=>row.destination===pin.destination);
    if(imported.length!==1||!['source','destination','bytes','sha256'].every(key=>imported[0][key]===pin[key]))
      throw new Error(`E8 original import provenance mismatch: ${pin.name}`);
    let found=false;
    for(const directory of new Set([env.BLUSTONE_PACKAGE_DIR,env.BLUSTONE_RESOURCE_ASSET_DIR])) {
      if(typeof directory!=='string'||!directory)throw new Error('Missing original resource directory');
      const file=path.resolve(resourceRoot,directory,pin.name);
      if(!existsSync(file))continue;
      if(!statSync(file).isFile())throw new Error(`E8 original is not a file: ${pin.name}`);
      const bytes=readFileSync(file);
      if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)throw new Error(`E8 original bytes/hash conflict: ${pin.name}`);
      found=true;
    }
    if(!found)throw new Error(`Missing E8 original: ${pin.name}`);
  }
  const next=Math.max(1634689,...ownStamps.map(value=>value+(isBaseline?1:0)),Math.max(...sourceStamps)+1);
  if(next>maxStamp)throw new Error('E8 resource stamp overflow');
  const candidate=structuredClone(profile);
  candidate.name='current-e8';candidate.source='Prepared original E08 continuation:169 reviewed restoration groups plus14 exact original packs; native boot, earned entry, combat, progress and reward metadata remain pending';
  candidate.preparedOnly=true;candidate.expectedPackages=183;candidate.resourceStamp=String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES=allNames.join(',');
  for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}

/** Create-only publication; a reviewed different candidate is never replaced. */
export function writeE8Candidate(candidate,destination) {
  if(existsSync(destination)) {
    if(!isDeepStrictEqual(JSON.parse(readFileSync(destination,'utf8')),candidate))throw new Error('Existing E8 candidate differs; refusing overwrite');
  }else writeFileSync(destination,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const candidate=prepareE8Profile(readJson('config/profiles/current-restoration.json'));
  const destination=path.join(repoRoot,'config/profiles/current-e8.json');
  if(!process.argv.includes('--inspect-only'))writeE8Candidate(candidate,destination);
  console.log(JSON.stringify({preparedOnly:true,packages:candidate.expectedPackages,stamp:candidate.resourceStamp,
    addedOriginals:E8_ORIGINAL_NAMES.length,nativeValidation:'PENDING',inspectOnly:process.argv.includes('--inspect-only')}));
}
