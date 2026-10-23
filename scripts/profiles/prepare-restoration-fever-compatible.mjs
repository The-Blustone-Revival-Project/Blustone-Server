import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareRestorationFeverProfile} from './prepare-restoration-fever.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const outputName='current-restoration-fever-compatible-progression';
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
function stamps(profile) {
  const values=[profile?.resourceStamp??profile?.env?.BLUSTONE_RESOURCE_VERSION,...stampKeys.map(key=>profile?.env?.[key])];
  if(values.some(value=>typeof value!=='string'||!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>2147483647)||
    values.some(value=>value!==values[0]))throw new Error('Compatible restoration requires coherent positive signed32 stamps');
  return values.map(Number);
}
const peers=()=>readdirSync(path.join(root,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!==outputName+'.json')
  .map(name=>read('config/profiles/'+name));
const policies=env=>Object.fromEntries(Object.entries(env).filter(([key])=>key!=='BLUSTONE_PACKAGE_NAMES'&&!stampKeys.includes(key)));

/** Exact resource coverage from the verified170 preparation; every other policy
 * comes from the existing compatible140 runtime profile. No state or activation. */
export function prepareCompatibleRestorationFeverProfile(profile,{resourceRoot=root,sourceProfiles=peers(),
  resourceProfile=read('config/profiles/current-restoration-fever.json'),ledger=read('resources/manifests/imported-files.json')}={}) {
  const runtime=read('config/profiles/current-e6-fever-compatible-progression.json');
  const oldNames=runtime.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(runtime.expectedPackages!==140||oldNames.length!==140||new Set(oldNames).size!==140)
    throw new Error('Restore the exact compatible140 runtime baseline');
  // Existing preparer verifies the exact169->170 union, all33 immutable pins,
  // provenance and every preferred/fallback copy. Peer freshness is handled below.
  const verified=prepareRestorationFeverProfile(resourceProfile,{resourceRoot,ledger,sourceProfiles:[]});
  const names=verified.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(resourceProfile.expectedPackages!==170||!isDeepStrictEqual(resourceProfile.env.BLUSTONE_PACKAGE_NAMES,names.join(','))||
    oldNames.some(name=>!names.includes(name)))throw new Error('Compatible restoration requires the verified complete170 resource union');
  if(profile?.resourceStamp===undefined)throw new Error('Compatible restoration requires a declared source stamp');
  const own=stamps(profile),source=[runtime,resourceProfile,...sourceProfiles].flatMap(stamps);
  const current=profile?.env?.BLUSTONE_PACKAGE_NAMES?.split(',');
  const complete=isDeepStrictEqual(current,names),baseline=isDeepStrictEqual(current,oldNames);
  if((!baseline&&!complete)||profile.expectedPackages!==current.length)
    throw new Error('Compatible restoration requires exact ordered140 baseline or170 completed selection');
  if(!isDeepStrictEqual(policies(profile.env),policies(runtime.env)))
    throw new Error('Compatible restoration must retain every compatible runtime policy');
  const next=Math.max(1634693,...own.map(value=>value+(complete?0:1)),Math.max(...source)+1);
  if(next>2147483647)throw new Error('Compatible restoration stamp overflow');
  const candidate=structuredClone(profile);
  candidate.name=outputName;
  candidate.source='Prepared verified170 original resource union with exact compatible140 nonresource policies; native broader-area validation pending, no ownership/progression grant';
  candidate.preparedOnly=true;candidate.expectedPackages=170;candidate.resourceStamp=String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES=names.join(',');
  for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}
export function writeCompatibleRestorationFeverCandidate(candidate,destination) {
  if(existsSync(destination)) {
    if(!isDeepStrictEqual(JSON.parse(readFileSync(destination,'utf8')),candidate))throw new Error('Existing compatible restoration candidate differs; refusing overwrite');
  }else writeFileSync(destination,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')||process.argv.slice(2).length>1)throw new Error('Usage: prepare-restoration-fever-compatible.mjs [--inspect-only]');
  const candidate=prepareCompatibleRestorationFeverProfile(read('config/profiles/current-e6-fever-compatible-progression.json'));
  if(!process.argv.includes('--inspect-only'))writeCompatibleRestorationFeverCandidate(candidate,path.join(root,'config/profiles/'+outputName+'.json'));
  console.log(JSON.stringify({preparedOnly:true,packages:170,stamp:candidate.resourceStamp,nativeValidation:'PENDING',inspectOnly:process.argv.includes('--inspect-only')}));
}
