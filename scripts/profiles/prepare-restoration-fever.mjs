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
export const RESTORATION_FEVER_NAMES=Object.freeze(['CFE_PUB.jet']);
export const FEVER_ORIGINAL=Object.freeze({name:'CFE_PUB.jet',bytes:281615,
  sha256:'bae718faf6aa7f1b5f6f868ea77db78e3fc8f0770999729fa64dc1b99e4b7f8b',
  source:'recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/CFE_PUB.jet',
  destination:'resources/runtime/assets/CFE_PUB.jet'});
export function restorationFeverOriginals() {return [{...FEVER_ORIGINAL}];}

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
  return readdirSync(path.join(repoRoot,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!=='current-restoration-fever.json')
    .map(name=>readJson('config/profiles/'+name));
}

/** Pure inactive continuation of the reviewed169-group restoration selection.
 * Resource root/source profiles are injectable for isolated corruption tests.
 * No source profile, payload, server, environment or saved account is mutated. */
export function prepareRestorationFeverProfile(profile,{resourceRoot=repoRoot,sourceProfiles=peerProfiles(),originals=restorationFeverOriginals(),
  ledger=readJson('resources/manifests/imported-files.json')}={}) {
  const baseline=readJson('config/profiles/current-restoration.json'),baseNames=baseline.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(baseNames.length!==169||new Set(baseNames).size!==169||baseline.expectedPackages!==169)
    throw new Error('Restore the reviewed169-group source profile');
  stamp(profile?.resourceStamp,'declared Restoration fever source resourceStamp');
  const sourceStamps=[baseline,...sourceProfiles].flatMap(profileStamps),ownStamps=profileStamps(profile);
  const env=profile.env;
  if(!env||typeof env.BLUSTONE_PACKAGE_NAMES!=='string')throw new Error('Missing complete Restoration fever baseline package list');
  const names=env.BLUSTONE_PACKAGE_NAMES.split(','),allNames=[...baseNames,...RESTORATION_FEVER_NAMES];
  const isBaseline=isDeepStrictEqual(names,baseNames),isComplete=isDeepStrictEqual(names,allNames);
  if((!isBaseline&&!isComplete)||profile.expectedPackages!==names.length||new Set(allNames).size!==170)
    throw new Error('Restoration fever requires exact ordered169 baseline or170 completed selection');
  const neutralEnv=raw=>Object.fromEntries(Object.entries(raw).filter(([key])=>!stampKeys.includes(key)&&key!=='BLUSTONE_PACKAGE_NAMES'));
  if(!isDeepStrictEqual(neutralEnv(env),neutralEnv(baseline.env)))throw new Error('Restoration fever must retain every reviewed baseline setting');
  const canonical=restorationFeverOriginals();
  if(!isDeepStrictEqual(originals,canonical))throw new Error('Restoration fever original inventory differs from pinned source');
  if(!Array.isArray(ledger))throw new Error('Invalid original import ledger');
  // Retain the reviewed32 prior additions/prerequisites as well as the original fever pack.
  // A corrupted prior original must not become an apparently ready Restoration fever profile.
  for(const pin of [...restorationOriginals(),...originals]) {
    const imported=ledger.filter(row=>row.destination===pin.destination);
    if(imported.length!==1||!['source','destination','bytes','sha256'].every(key=>imported[0][key]===pin[key]))
      throw new Error(`Restoration fever original import provenance mismatch: ${pin.name}`);
    let found=false;
    for(const directory of new Set([env.BLUSTONE_PACKAGE_DIR,env.BLUSTONE_RESOURCE_ASSET_DIR])) {
      if(typeof directory!=='string'||!directory)throw new Error('Missing original resource directory');
      const file=path.resolve(resourceRoot,directory,pin.name);
      if(!existsSync(file))continue;
      if(!statSync(file).isFile())throw new Error(`Restoration fever original is not a file: ${pin.name}`);
      const bytes=readFileSync(file);
      if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)throw new Error(`Restoration fever original bytes/hash conflict: ${pin.name}`);
      found=true;
    }
    if(!found)throw new Error(`Missing Restoration fever original: ${pin.name}`);
  }
  const next=Math.max(1634692,...ownStamps.map(value=>value+(isBaseline?1:0)),Math.max(...sourceStamps)+1);
  if(next>maxStamp)throw new Error('Restoration fever resource stamp overflow');
  const candidate=structuredClone(profile);
  candidate.name='current-restoration-fever';candidate.source='Prepared original shared fever dependency:169 reviewed restoration groups plus pinned CFE_PUB; no activation, new progression or native outside-E6 validation claimed';
  candidate.preparedOnly=true;candidate.expectedPackages=170;candidate.resourceStamp=String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES=allNames.join(',');
  for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}

/** Create-only publication; a reviewed different candidate is never replaced. */
export function writeRestorationFeverCandidate(candidate,destination) {
  if(existsSync(destination)) {
    if(!isDeepStrictEqual(JSON.parse(readFileSync(destination,'utf8')),candidate))throw new Error('Existing Restoration fever candidate differs; refusing overwrite');
  }else writeFileSync(destination,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')||process.argv.slice(2).length>1)throw new Error('Usage: prepare-restoration-fever.mjs [--inspect-only]');
  const candidate=prepareRestorationFeverProfile(readJson('config/profiles/current-restoration.json'));
  const destination=path.join(repoRoot,'config/profiles/current-restoration-fever.json');
  if(!process.argv.includes('--inspect-only'))writeRestorationFeverCandidate(candidate,destination);
  console.log(JSON.stringify({preparedOnly:true,packages:candidate.expectedPackages,stamp:candidate.resourceStamp,
    addedOriginals:RESTORATION_FEVER_NAMES.length,nativeValidation:'PENDING',inspectOnly:process.argv.includes('--inspect-only')}));
}
