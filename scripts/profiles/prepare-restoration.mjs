import {readFileSync,existsSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const e7=['C007.jet','C007_EFT.jet','C007_Q.jet','C011.jet','C011_EFT.jet','C011_Q.jet','C011_SND.jet','C016.jet','C016_EFT.jet','C016_Q.jet','C016_SND.jet','C018.jet','C018_EFT.jet','C018_Q.jet','M020.jet','N007.jet','ST901.jet'];
const materials=['C014_Q.jet','C014_EFT.jet','C014_SND.jet','C030_Q.jet','C030_EFT.jet','C030_SND.jet','C048_Q.jet','C048_EFT.jet','C048_SND.jet','C054_Q.jet','C054_EFT.jet'];
const added=[...e7,...materials,'GUILD.jet','MIRAGE.jet'];
const definitions=[
  ['episode07-originals.json',e7,'002b4ecd1fa40d2437aeedfc95020cc4bb48c9f2c95d31538dc222707a94b5ab'],
  ['character-materials18-originals.json',materials,'ae32c0781e998ce4d86fc3fec6036064cac728b2cbd3f2d47b8ed9a2e5407257'],
  ['guild-originals.json',['GUILD.jet'],'627bda5c5de4f9e889a99b3d1c3e8dc2b6c8c147b6526ea627df0d41e438118b'],
  ['mirage-originals.json',['LEVELING.jet','ST002.jet','MIRAGE.jet'],'ddfb20ea1174612cae1f43e6d6c1d89574d5e09711da65a920438f7c1a997e32'],
];
const profileSources=[['current-e7',e7],['current-e6-materials18',materials],['current-e6-guild',['GUILD.jet']],['current-e6-mirage',['MIRAGE.jet']]];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function stamp(value) {
  if(typeof value!=='string'||!/^[1-9][0-9]*$/.test(value)||Number(value)>0x7fffffff)throw new Error('Invalid restoration signed32 stamp');return Number(value);
}
const baseline=()=>JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6-materials.json'),'utf8'));

/** Full import provenance:30 appended packs plus2 existing prerequisites.
 * Fixed manifest bytes establish identity before the independent ledger join. */
export function restorationOriginals({sourceRoot=root}={}) {
  const ledger=JSON.parse(readFileSync(path.join(sourceRoot,'resources/manifests/imported-files.json'),'utf8'));
  if(!Array.isArray(ledger))throw new Error('Invalid restoration import ledger');
  const byName=new Map();
  for(const [file,names,sha256] of definitions) {
    const bytes=readFileSync(path.join(sourceRoot,'resources/manifests',file));
    // Text manifests tolerate Git LF/CRLF checkout conversion; original pack
    // bytes below are always hashed exactly, without any normalization.
    if(digest(Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n')))!==sha256)throw new Error('Changed restoration source manifest: '+file);
    const rows=JSON.parse(bytes.toString('utf8'));
    if(!Array.isArray(rows)||rows.length!==names.length||rows.some((row,i)=>row.name!==names[i]))throw new Error('Invalid restoration source manifest order/count');
    for(const row of rows) {
      const destination='resources/runtime/assets/'+row.name;
      if(!Number.isSafeInteger(row.bytes)||row.bytes<1||!/^[a-f0-9]{64}$/.test(row.sha256)||row.destination!==undefined&&row.destination!==destination)
        throw new Error('Malformed restoration original pin');
      const imports=ledger.filter(item=>item.destination===destination);
      if(imports.length!==1||imports[0].bytes!==row.bytes||imports[0].sha256!==row.sha256||
        imports[0].source!==`recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/${row.name}`||row.source!==undefined&&imports[0].source!==row.source)
        throw new Error('Restoration original import ledger mismatch: '+row.name);
      if(byName.has(row.name)&&JSON.stringify(byName.get(row.name))!==JSON.stringify(imports[0]))throw new Error('Conflicting restoration original manifests');
      byName.set(row.name,imports[0]);
    }
  }
  if(byName.size!==32||new Set(added).size!==30)throw new Error('Invalid restoration union cardinality');
  return [...added,'LEVELING.jet','ST002.jet'].map(name=>({name,role:added.includes(name)?'added':'prerequisite',
    source:byName.get(name).source,destination:byName.get(name).destination,bytes:byName.get(name).bytes,sha256:byName.get(name).sha256}));
}

export function prepareRestorationProfile(profile,{resourceRoot=root,sourceProfiles,originals}={}) {
  const canonical=baseline(),prefix=canonical.env.BLUSTONE_PACKAGE_NAMES.split(','),env=profile?.env;
  if(prefix.length!==139||!env||typeof env.BLUSTONE_PACKAGE_NAMES!=='string')throw new Error('Missing exact restoration baseline');
  const names=env.BLUSTONE_PACKAGE_NAMES.split(','),full=[...prefix,...added];
  if(![139,169].includes(names.length)||profile.expectedPackages!==names.length||new Set(names).size!==names.length||
    names.join(',')!==(names.length===139?prefix:full).join(','))throw new Error('Restore exact139 baseline or complete169 restoration selection');
  if(env.BLUSTONE_RESOURCE_ASSET_NAMES!==','||env.BLUSTONE_RESOURCE_ASSET_GLOB||env.BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA||
    env.BLUSTONE_PACKAGE_MODE!=='pkgi1-tree'||env.BLUSTONE_CARD_REFERENCE_PROFILE!=='materials'||
    env.BLUSTONE_CARD_STAT_PROFILE!==canonical.env.BLUSTONE_CARD_STAT_PROFILE||env.BLUSTONE_ACTIVE_SKILLS!==canonical.env.BLUSTONE_ACTIVE_SKILLS||
    Object.keys(env).some(key=>!Object.hasOwn(canonical.env,key))||Object.keys(canonical.env).some(key=>!Object.hasOwn(env,key)))throw new Error('Restore separate original groups and baseline reference settings; no optional runtime flags');
  const pins=restorationOriginals();
  if(originals!==undefined&&JSON.stringify(originals)!==JSON.stringify(pins))throw new Error('Restoration manifest differs from source identity/provenance');
  const sources=sourceProfiles??profileSources.map(([name])=>JSON.parse(readFileSync(path.join(root,'config/profiles',name+'.json'),'utf8')));
  if(!Array.isArray(sources)||sources.length!==4)throw new Error('Invalid restoration source profiles');
  const stamps=stampKeys.map(key=>stamp(env[key]));if(profile.resourceStamp!==undefined)stamps.push(stamp(profile.resourceStamp));
  const sourceStamps=[];
  for(const [i,[name,extras]] of profileSources.entries()) {
    const source=sources[i];
    if(source?.name!==name||source.expectedPackages!==139+extras.length||source.env?.BLUSTONE_PACKAGE_NAMES!==[...prefix,...extras].join(','))throw new Error('Changed restoration source profile union');
    sourceStamps.push(stamp(source.resourceStamp),...stampKeys.map(key=>stamp(source.env[key])));
  }
  const next=Math.max(1634688,Math.max(...stamps)+(names.length===139?1:0),Math.max(...sourceStamps)+1);
  if(next>0x7fffffff)throw new Error('Restoration resource stamp overflow');
  for(const pin of pins) {
    let found=false;
    for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_RESOURCE_ASSET_DIR']) {
      if(typeof env[key]!=='string'||!env[key])throw new Error('Missing restoration resource directory');
      const file=path.resolve(resourceRoot,env[key],pin.name);if(!existsSync(file))continue;found=true;
      if(!statSync(file).isFile()||statSync(file).size!==pin.bytes||digest(readFileSync(file))!==pin.sha256)throw new Error('Conflicting restoration original: '+pin.name);
    }
    if(!found)throw new Error('Missing restoration original: '+pin.name);
  }
  const candidate=structuredClone(profile);
  Object.assign(candidate,{name:'current-restoration',source:'Prepared combined E6 materials baseline +E7 +completed Hunter kits +Guild +Mirage originals; native activation pending',
    preparedOnly:true,expectedPackages:169,resourceStamp:String(next)});
  candidate.env.BLUSTONE_PACKAGE_NAMES=full.join(',');for(const key of stampKeys)candidate.env[key]=String(next);
  return candidate;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.slice(2).some(arg=>arg!=='--inspect-only'))throw new Error('Usage: prepare-restoration.mjs [--inspect-only]');
  const candidate=prepareRestorationProfile(baseline()),pins=restorationOriginals();
  if(process.argv.includes('--inspect-only'))console.log(JSON.stringify(candidate,null,2));
  else {
    const outputs=[['config/profiles/current-restoration.json',candidate],['resources/manifests/restoration-originals.json',pins]]
      .map(([file,value])=>[path.join(root,file),JSON.stringify(value,null,2)+'\n']);
    for(const [file,text] of outputs)if(existsSync(file)&&readFileSync(file,'utf8')!==text)throw new Error('Existing restoration candidate differs; refusing overwrite/stamp regression');
    for(const [file,text] of outputs)if(!existsSync(file))writeFileSync(file,text,{flag:'wx'});
    console.log('Prepared inactive restoration:169 packages/stamp'+candidate.resourceStamp+';32 provenance pins,30 additions.');
  }
}
