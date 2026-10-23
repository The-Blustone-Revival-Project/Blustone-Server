import {existsSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareE10CompatibleProfile} from './prepare-e10-compatible.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const outputName='current-later-episodes';
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const LATER_EPISODES_MANIFEST_SHA256='3d625ba400709d4636b8ab0ab3512da54d8bceac8b3fd197b0acaeb61fd1eb55';
export function laterEpisodeOriginals() {
  const text=readFileSync(path.join(root,'resources/manifests/later-episodes-originals.json'),'utf8');
  if(sha(Buffer.from(text.replace(/\r\n/g,'\n')))!==LATER_EPISODES_MANIFEST_SHA256)throw new Error('Later Episode manifest pin mismatch');
  const rows=JSON.parse(text);
  if(!Array.isArray(rows)||rows.length!==70||new Set(rows.map(row=>row.name)).size!==70)
    throw new Error('Later Episode manifest must contain70 unique originals');
  return rows;
}
function stamps(profile) {
  const values=[profile?.resourceStamp??profile?.env?.BLUSTONE_RESOURCE_VERSION,...stampKeys.map(key=>profile?.env?.[key])];
  if(values.some(value=>typeof value!=='string'||!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>2147483647)||
    values.some(value=>value!==values[0]))throw new Error('Later Episodes require coherent positive signed32 stamps');
  return values.map(Number);
}
const peers=()=>readdirSync(path.join(root,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!==outputName+'.json')
  .map(name=>read('config/profiles/'+name));
const policies=env=>Object.fromEntries(Object.entries(env).filter(([key])=>key!=='BLUSTONE_PACKAGE_NAMES'&&!stampKeys.includes(key)));

/** Pure inactive original resource union. Existing compatible E10 preparation
 * validates73 ancestor pins. Expanded runtime policies remain exactly210's. */
export function prepareLaterEpisodesProfile(profile,{resourceRoot=root,sourceProfiles=peers(),
  originals=laterEpisodeOriginals(),ledger=read('resources/manifests/imported-files.json')}={}) {
  const baseline=read('config/profiles/current-e10-expanded-character-progression.json');
  const sibling=read('config/profiles/current-e10-compatible-progression.json');
  const verified=prepareE10CompatibleProfile(sibling,{resourceRoot,ledger,sourceProfiles:[]});
  const baseNames=baseline.env.BLUSTONE_PACKAGE_NAMES.split(',');
  const expectedPolicies={...policies(sibling.env),BLUSTONE_MATERIAL_SKILL_PROFILE:'episode-indexed-expanded-projection',
    BLUSTONE_MATERIAL_STAT_PROFILE:'archive-2019-expanded-projection',
    BLUSTONE_HUNTER_MIN_RANK_PROFILE:'expanded-material-catalogue-birth-rank-projection'};
  if(baseline.expectedPackages!==210||baseNames.length!==210||new Set(baseNames).size!==210||
    baseline.env.BLUSTONE_PACKAGE_NAMES!==verified.env.BLUSTONE_PACKAGE_NAMES||
    !isDeepStrictEqual(policies(baseline.env),expectedPolicies))
    throw new Error('Restore exact expanded-character210 baseline resources and reviewed policies');
  const canonical=laterEpisodeOriginals();
  if(!isDeepStrictEqual(originals,canonical))throw new Error('Later Episode inventory differs from pinned source');
  const names=[...baseNames,...canonical.map(row=>row.name)];
  if(new Set(names).size!==280)throw new Error('Later Episodes require exact ordered210+70 union');
  const current=profile?.env?.BLUSTONE_PACKAGE_NAMES?.split(',');
  const complete=isDeepStrictEqual(current,names),isBaseline=isDeepStrictEqual(current,baseNames);
  if((!complete&&!isBaseline)||profile.expectedPackages!==current.length)
    throw new Error('Later Episodes require exact ordered210 baseline or280 complete selection');
  if(!isDeepStrictEqual(policies(profile.env),policies(baseline.env)))
    throw new Error('Later Episodes must preserve every expanded-character210 policy');
  if(profile?.resourceStamp===undefined)throw new Error('Later Episodes require declared source stamp');
  const own=stamps(profile),sources=[baseline,...sourceProfiles].flatMap(stamps);
  if(!Array.isArray(ledger))throw new Error('Invalid original import ledger');
  for(const pin of canonical) {
    const rows=ledger.filter(row=>row.destination===pin.destination);
    if(rows.length!==1||!['source','destination','bytes','sha256'].every(key=>rows[0][key]===pin[key]))
      throw new Error('Later Episode original provenance mismatch: '+pin.name);
    let found=false;
    for(const directory of new Set([profile.env.BLUSTONE_PACKAGE_DIR,profile.env.BLUSTONE_RESOURCE_ASSET_DIR])) {
      if(typeof directory!=='string'||!directory)throw new Error('Missing original resource directory');
      const file=path.resolve(resourceRoot,directory,pin.name);
      if(!existsSync(file))continue;
      if(!statSync(file).isFile())throw new Error('Original is not a file: '+pin.name);
      const bytes=readFileSync(file);
      if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)throw new Error('Original bytes/hash conflict: '+pin.name);
      found=true;
    }
    if(!found)throw new Error('Missing later Episode original: '+pin.name);
  }
  const next=Math.max(1634696,...own.map(value=>value+(complete?0:1)),Math.max(...sources)+1);
  if(next>2147483647)throw new Error('Later Episode stamp overflow');
  const candidate=structuredClone(profile);
  candidate.name=outputName;candidate.source='Prepared280 original groups: exact expanded-character210 policies plus70 E11–E18 original resource packs. Native execution, dialogue variant-reference consumers and reward metadata PENDING; no progress, reward or ownership grant';
  candidate.preparedOnly=true;candidate.expectedPackages=280;candidate.resourceStamp=String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES=names.join(',');for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}
export function writeLaterEpisodesCandidate(candidate,destination) {
  if(existsSync(destination)) {
    if(!isDeepStrictEqual(JSON.parse(readFileSync(destination,'utf8')),candidate))throw new Error('Existing later Episode candidate differs; refusing overwrite');
  }else writeFileSync(destination,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only')||process.argv.slice(2).length>1)
    throw new Error('Usage: prepare-later-episodes.mjs [--inspect-only]');
  const candidate=prepareLaterEpisodesProfile(read('config/profiles/current-e10-expanded-character-progression.json'));
  if(!process.argv.includes('--inspect-only'))writeLaterEpisodesCandidate(candidate,path.join(root,'config/profiles/'+outputName+'.json'));
  console.log(JSON.stringify({preparedOnly:true,packages:280,stamp:candidate.resourceStamp,missingOriginalGroups:70,
    nativeValidation:'PENDING',variantReferenceConsumer:'PENDING',inspectOnly:process.argv.includes('--inspect-only')}));
}
