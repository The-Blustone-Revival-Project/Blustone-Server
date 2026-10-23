import {existsSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {restorationOriginals} from './prepare-restoration.mjs';
import {episode08Originals} from './prepare-e8.mjs';
import {episode09Originals} from './prepare-e9.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const maxStamp=2147483647;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJson=name=>JSON.parse(readFileSync(path.join(repoRoot,name),'utf8'));
export const E10_ORIGINAL_NAMES=Object.freeze(["M012.jet", "CUT_E1001.jet", "CUT_E1002.jet", "CUT_E1003.jet"]);
export const E10_MANIFEST_SHA256='37e0947649abebf7f7566fec73f6fd2032ae8885ccfda0b6efe5ce9a3d806162';

/** Text pin tolerates checkout LF/CRLF only. Original payload hashes below are
 * always checked over exact binary bytes. This never accesses a private source. */
export function episode10Originals() {
  const text=readFileSync(path.join(repoRoot,'resources/manifests/episode10-originals.json'),'utf8');
  if(sha(Buffer.from(text.replace(/\r\n/g,'\n')))!==E10_MANIFEST_SHA256)throw new Error('E10 original manifest pin mismatch');
  const rows=JSON.parse(text);
  if(!Array.isArray(rows)||!isDeepStrictEqual(rows.map(row=>row.name),E10_ORIGINAL_NAMES))throw new Error('Invalid E10 original manifest order');
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
  return readdirSync(path.join(repoRoot,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!=='current-e10.json')
    .map(name=>readJson('config/profiles/'+name));
}

/** Pure inactive continuation of the reviewed205-group restoration selection.
 * Resource root/source profiles are injectable for isolated corruption tests.
 * No source profile, payload, server, environment or saved account is mutated. */
export function prepareE10Profile(profile,{resourceRoot=repoRoot,sourceProfiles=peerProfiles(),originals=episode10Originals(),
  ledger=readJson('resources/manifests/imported-files.json')}={}) {
  const baseline=readJson('config/profiles/current-e9.json'),baseNames=baseline.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(baseNames.length!==205||new Set(baseNames).size!==205||baseline.expectedPackages!==205)
    throw new Error('Restore the reviewed205-group source profile');
  stamp(profile?.resourceStamp,'declared E10 source resourceStamp');
  const sourceStamps=[baseline,...sourceProfiles].flatMap(profileStamps),ownStamps=profileStamps(profile);
  const env=profile.env;
  if(!env||typeof env.BLUSTONE_PACKAGE_NAMES!=='string')throw new Error('Missing complete E10 baseline package list');
  const names=env.BLUSTONE_PACKAGE_NAMES.split(','),allNames=[...baseNames,...E10_ORIGINAL_NAMES];
  const isBaseline=isDeepStrictEqual(names,baseNames),isComplete=isDeepStrictEqual(names,allNames);
  if((!isBaseline&&!isComplete)||profile.expectedPackages!==names.length||new Set(allNames).size!==209)
    throw new Error('E10 requires exact ordered205 baseline or209 completed selection');
  const neutralEnv=raw=>Object.fromEntries(Object.entries(raw).filter(([key])=>!stampKeys.includes(key)&&key!=='BLUSTONE_PACKAGE_NAMES'));
  if(!isDeepStrictEqual(neutralEnv(env),neutralEnv(baseline.env)))throw new Error('E10 must retain every reviewed baseline setting');
  const canonical=episode10Originals();
  if(!isDeepStrictEqual(originals,canonical))throw new Error('E10 original inventory differs from pinned source');
  if(!Array.isArray(ledger))throw new Error('Invalid original import ledger');
  // Retain the reviewed68 prior additions/prerequisites as well as the new4.
  // A corrupted prior original must not become an apparently ready E10 profile.
  for(const pin of [...restorationOriginals(),...episode08Originals(),...episode09Originals(),...originals]) {
    const imported=ledger.filter(row=>row.destination===pin.destination);
    if(imported.length!==1||!['source','destination','bytes','sha256'].every(key=>imported[0][key]===pin[key]))
      throw new Error(`E10 original import provenance mismatch: ${pin.name}`);
    let found=false;
    for(const directory of new Set([env.BLUSTONE_PACKAGE_DIR,env.BLUSTONE_RESOURCE_ASSET_DIR])) {
      if(typeof directory!=='string'||!directory)throw new Error('Missing original resource directory');
      const file=path.resolve(resourceRoot,directory,pin.name);
      if(!existsSync(file))continue;
      if(!statSync(file).isFile())throw new Error(`E10 original is not a file: ${pin.name}`);
      const bytes=readFileSync(file);
      if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)throw new Error(`E10 original bytes/hash conflict: ${pin.name}`);
      found=true;
    }
    if(!found)throw new Error(`Missing E10 original: ${pin.name}`);
  }
  const next=Math.max(1634694,...ownStamps.map(value=>value+(isBaseline?1:0)),Math.max(...sourceStamps)+1);
  if(next>maxStamp)throw new Error('E10 resource stamp overflow');
  const candidate=structuredClone(profile);
  candidate.name='current-e10';candidate.source='Prepared original E10 continuation:205 reviewed E9 groups plus4 exact original packs (M012 owns M034/M035/M036); native boot, earned entry, combat, progress and reward metadata remain pending';
  candidate.preparedOnly=true;candidate.expectedPackages=209;candidate.resourceStamp=String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES=allNames.join(',');
  for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}

/** Create-only publication; a reviewed different candidate is never replaced. */
export function writeE10Candidate(candidate,destination) {
  if(existsSync(destination)) {
    if(!isDeepStrictEqual(JSON.parse(readFileSync(destination,'utf8')),candidate))throw new Error('Existing E10 candidate differs; refusing overwrite');
  }else writeFileSync(destination,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')||process.argv.slice(2).length>1)
    throw new Error('Usage: prepare-e10.mjs [--inspect-only]');
  const candidate=prepareE10Profile(readJson('config/profiles/current-e9.json'));
  const destination=path.join(repoRoot,'config/profiles/current-e10.json');
  if(!process.argv.includes('--inspect-only'))writeE10Candidate(candidate,destination);
  console.log(JSON.stringify({preparedOnly:true,packages:candidate.expectedPackages,stamp:candidate.resourceStamp,
    addedOriginals:E10_ORIGINAL_NAMES.length,nativeValidation:'PENDING',inspectOnly:process.argv.includes('--inspect-only')}));
}
