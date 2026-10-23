import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCompatibleRestorationFeverProfile} from './prepare-restoration-fever-compatible.mjs';
import {prepareE10Profile} from './prepare-e10.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const outputName='current-e10-compatible-progression';
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
function stamps(profile) {
  const values=[profile?.resourceStamp??profile?.env?.BLUSTONE_RESOURCE_VERSION,...stampKeys.map(key=>profile?.env?.[key])];
  if(values.some(value=>typeof value!=='string'||!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>2147483647)||
    values.some(value=>value!==values[0]))throw new Error('Compatible E10 requires coherent positive signed32 stamps');
  return values.map(Number);
}
const peers=()=>readdirSync(path.join(root,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!==outputName+'.json')
  .map(name=>read('config/profiles/'+name));
const policies=env=>Object.fromEntries(Object.entries(env).filter(([key])=>key!=='BLUSTONE_PACKAGE_NAMES'&&!stampKeys.includes(key)));

/** Pure inactive union. Both existing preparers validate original pins, source
 * ledgers and every preferred/fallback copy with isolated peer lists. Only this
 * new output gets a new globally fresh stamp; no existing profile is rewritten. */
export function prepareE10CompatibleProfile(profile,{resourceRoot=root,sourceProfiles=peers(),
  resourceProfile=read('config/profiles/current-e10.json'),ledger=read('resources/manifests/imported-files.json')}={}) {
  const runtime=read('config/profiles/current-restoration-fever-compatible-progression.json');
  const verifiedRuntime=prepareCompatibleRestorationFeverProfile(runtime,{resourceRoot,ledger,sourceProfiles:[]});
  const baseline=runtime.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(runtime.expectedPackages!==170||baseline.length!==170||new Set(baseline).size!==170||
    verifiedRuntime.env.BLUSTONE_PACKAGE_NAMES!==runtime.env.BLUSTONE_PACKAGE_NAMES)
    throw new Error('Restore the exact reviewed compatible170 runtime baseline');
  const verifiedE10=prepareE10Profile(resourceProfile,{resourceRoot,ledger,sourceProfiles:[]});
  const resources=verifiedE10.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if(resourceProfile.expectedPackages!==209||resources.length!==209||resourceProfile.env.BLUSTONE_PACKAGE_NAMES!==resources.join(','))
    throw new Error('Compatible E10 requires the reviewed complete209 resource profile');
  const missing=resources.filter(name=>!baseline.includes(name)),names=[...baseline,...missing];
  if(missing.length!==40||names.length!==210||new Set(names).size!==210||
    !isDeepStrictEqual(baseline.filter(name=>!resources.includes(name)),['CFE_PUB.jet']))
    throw new Error('Compatible E10 requires the exact210 union with original fever retained');
  if(profile?.resourceStamp===undefined)throw new Error('Compatible E10 requires a declared source stamp');
  const own=stamps(profile),sources=[runtime,resourceProfile,...sourceProfiles].flatMap(stamps);
  const current=profile?.env?.BLUSTONE_PACKAGE_NAMES?.split(',');
  const complete=isDeepStrictEqual(current,names),isBaseline=isDeepStrictEqual(current,baseline);
  if((!complete&&!isBaseline)||profile.expectedPackages!==current.length)
    throw new Error('Compatible E10 requires exact ordered170 baseline or210 completed selection');
  if(!isDeepStrictEqual(policies(profile.env),policies(runtime.env)))
    throw new Error('Compatible E10 must preserve every compatible170 runtime policy');
  const next=Math.max(1634695,...own.map(value=>value+(complete?0:1)),Math.max(...sources)+1);
  if(next>2147483647)throw new Error('Compatible E10 stamp overflow');
  const candidate=structuredClone(profile);
  candidate.name=outputName;
  candidate.source='Prepared210 original groups: exact compatible170 runtime policies and resource order plus40 missing reviewed E10 packs; retains CFE_PUB and all adopted progression settings, no activation or ownership/progression grant';
  candidate.preparedOnly=true;candidate.expectedPackages=210;candidate.resourceStamp=String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES=names.join(',');
  for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}
/** Create-only publication; different reviewed output is never overwritten. */
export function writeE10CompatibleCandidate(candidate,destination) {
  if(existsSync(destination)) {
    if(!isDeepStrictEqual(JSON.parse(readFileSync(destination,'utf8')),candidate))throw new Error('Existing compatible E10 candidate differs; refusing overwrite');
  }else writeFileSync(destination,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')||process.argv.slice(2).length>1)
    throw new Error('Usage: prepare-e10-compatible.mjs [--inspect-only]');
  const candidate=prepareE10CompatibleProfile(read('config/profiles/current-restoration-fever-compatible-progression.json'));
  if(!process.argv.includes('--inspect-only'))writeE10CompatibleCandidate(candidate,path.join(root,'config/profiles/'+outputName+'.json'));
  console.log(JSON.stringify({preparedOnly:true,packages:210,stamp:candidate.resourceStamp,missingOriginalGroups:40,
    nativeValidation:'PENDING',inspectOnly:process.argv.includes('--inspect-only')}));
}
