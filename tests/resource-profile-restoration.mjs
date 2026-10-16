import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {restorationOriginals,prepareRestorationProfile} from '../scripts/profiles/prepare-restoration.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceNames=['current-e6-materials','current-e7','current-e6-materials18','current-e6-guild','current-e6-mirage'];
const sourceFiles=sourceNames.map(name=>path.join(root,'config/profiles',name+'.json'));
const sourceBytes=sourceFiles.map(file=>readFileSync(file)),baseline=JSON.parse(sourceBytes[0]),sources=sourceBytes.slice(1).map(bytes=>JSON.parse(bytes));
const before=structuredClone(baseline),pins=restorationOriginals(),candidate=prepareRestorationProfile(baseline);
assert.equal(pins.length,32);assert.equal(pins.filter(row=>row.role==='added').length,30);
assert.deepEqual(pins.filter(row=>row.role==='prerequisite').map(row=>row.name),['LEVELING.jet','ST002.jet']);
assert.equal(new Set(pins.map(row=>row.name)).size,32);
const ledger=JSON.parse(readFileSync(path.join(root,'resources/manifests/imported-files.json'),'utf8'));
for(const pin of pins){const item=ledger.find(row=>row.destination===pin.destination);assert.ok(item);for(const key of ['source','destination','bytes','sha256'])assert.equal(pin[key],item[key]);}
assert.deepEqual(JSON.parse(readFileSync(path.join(root,'resources/manifests/restoration-originals.json'),'utf8')),pins);
assert.deepEqual(JSON.parse(readFileSync(path.join(root,'config/profiles/current-restoration.json'),'utf8')),candidate);
assert.equal(candidate.name,'current-restoration');assert.equal(candidate.preparedOnly,true);assert.equal(candidate.expectedPackages,169);assert.equal(candidate.resourceStamp,'1634688');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(',').slice(0,139),baseline.env.BLUSTONE_PACKAGE_NAMES.split(','));
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(',').slice(139),pins.filter(row=>row.role==='added').map(row=>row.name));
for(const [key,value] of Object.entries(baseline.env))if(![...stampKeys,'BLUSTONE_PACKAGE_NAMES'].includes(key))assert.equal(candidate.env[key],value);
for(const key of stampKeys)assert.equal(candidate.env[key],candidate.resourceStamp);
assert.equal(preflight(root,candidate),169);assert.deepEqual(prepareRestorationProfile(candidate),candidate);assert.deepEqual(baseline,before);
const future=structuredClone(baseline);future.resourceStamp='1900000';
assert.equal(prepareRestorationProfile(future).resourceStamp,'1900001');
const futureSources=structuredClone(sources);futureSources[2].env.BLUSTONE_RESLIST_HEADER_STAMP='1900010';
const futureCandidate=prepareRestorationProfile(baseline,{sourceProfiles:futureSources});assert.equal(futureCandidate.resourceStamp,'1900011');
assert.deepEqual(prepareRestorationProfile(futureCandidate,{sourceProfiles:futureSources}),futureCandidate);
assert.equal(prepareRestorationProfile(candidate,{sourceProfiles:futureSources}).resourceStamp,'1900011','Already prepared unions must not reuse a different source profile stamp');
const ceiling=structuredClone(candidate);for(const key of stampKeys)ceiling.env[key]='2147483647';ceiling.resourceStamp='2147483647';
assert.equal(prepareRestorationProfile(ceiling).resourceStamp,'2147483647');
const overflow=structuredClone(baseline);overflow.resourceStamp='2147483647';assert.throws(()=>prepareRestorationProfile(overflow),/overflow/);
const sourceOverflow=structuredClone(sources);sourceOverflow[3].resourceStamp='2147483647';assert.throws(()=>prepareRestorationProfile(baseline,{sourceProfiles:sourceOverflow}),/overflow/);
for(const value of ['0','-1','01','NaN','1.5','2147483648',1634688,undefined]){
  const bad=structuredClone(baseline);bad.env.BLUSTONE_RESOURCE_VERSION=value;assert.throws(()=>prepareRestorationProfile(bad),/stamp/);
}
for(const edit of [p=>p.expectedPackages--,p=>p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(','),
  p=>{p.env.BLUSTONE_PACKAGE_NAMES+=',MIRAGE.jet';p.expectedPackages++;},p=>{p.env.BLUSTONE_PACKAGE_NAMES+=',UNRELATED.jet';p.expectedPackages++;},
  p=>p.env.BLUSTONE_CARD_REFERENCE_PROFILE='fixture',p=>p.env.BLUSTONE_RESOURCE_ASSET_NAMES='MIRAGE.jet',
  p=>p.env.BLUSTONE_RESOURCE_ASSET_GLOB='*',p=>p.env.BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA='MIRAGE.jet',
  p=>p.env.BLUSTONE_MIRAGE_MODE='local-configured',p=>delete p.env.BLUSTONE_CATALOG_PATH]) {
  const bad=structuredClone(baseline);edit(bad);assert.throws(()=>prepareRestorationProfile(bad));
}
const badSources=structuredClone(sources);badSources[0].env.BLUSTONE_PACKAGE_NAMES+=',OTHER.jet';assert.throws(()=>prepareRestorationProfile(baseline,{sourceProfiles:badSources}),/source profile/);
for(const bad of [[],pins.slice(1),[...pins].reverse(),pins.map((row,i)=>i===0?{...row,sha256:'0'.repeat(64)}:row)])
  assert.throws(()=>prepareRestorationProfile(baseline,{originals:bad}),/identity/);

const temporary=mkdtempSync(path.join(tmpdir(),'blustone-restoration-profile-'));
try {
  const manifests=path.join(temporary,'resources/manifests');mkdirSync(manifests,{recursive:true});
  assert.throws(()=>restorationOriginals({sourceRoot:temporary}),/ENOENT/);
  for(const name of ['imported-files.json','episode07-originals.json','character-materials18-originals.json','guild-originals.json','mirage-originals.json'])
    copyFileSync(path.join(root,'resources/manifests',name),path.join(manifests,name));
  assert.deepEqual(restorationOriginals({sourceRoot:temporary}),pins);
  for(const name of ['episode07-originals.json','character-materials18-originals.json','guild-originals.json','mirage-originals.json']){
    const file=path.join(manifests,name);writeFileSync(file,readFileSync(file,'utf8').replaceAll('\r\n','\n'));
  }
  assert.deepEqual(restorationOriginals({sourceRoot:temporary}),pins,'Manifest identity tolerates LF/CRLF checkout conversion only');
  const ledgerFile=path.join(manifests,'imported-files.json'),goodLedger=readFileSync(ledgerFile);
  for(const edit of [rows=>rows.filter(row=>row.destination!==pins[0].destination),rows=>[...rows,rows.find(row=>row.destination===pins[0].destination)],
    rows=>rows.map(row=>row.destination===pins[0].destination?{...row,sha256:'0'.repeat(64)}:row)]) {
    writeFileSync(ledgerFile,JSON.stringify(edit(JSON.parse(goodLedger))));assert.throws(()=>restorationOriginals({sourceRoot:temporary}),/ledger mismatch/);
  }
  writeFileSync(ledgerFile,goodLedger);
  const e7File=path.join(manifests,'episode07-originals.json'),goodE7=readFileSync(e7File),badE7=JSON.parse(goodE7);badE7[0].name='MIRAGE.jet';badE7[0].sha256='0'.repeat(64);
  writeFileSync(e7File,JSON.stringify(badE7));assert.throws(()=>restorationOriginals({sourceRoot:temporary}),/source manifest/);
  writeFileSync(e7File,goodE7);
  const options={resourceRoot:temporary};assert.throws(()=>prepareRestorationProfile(baseline,options),/Missing restoration original/);
  for(const pin of pins){const dest=path.resolve(temporary,baseline.env.BLUSTONE_RESOURCE_ASSET_DIR,pin.name);assert.ok(dest.startsWith(temporary+path.sep));mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.join(root,pin.destination),dest);}
  assert.deepEqual(prepareRestorationProfile(baseline,options),candidate);
  for(const pin of [pins[0],...pins.filter(row=>row.role==='prerequisite'),pins.find(row=>row.name==='MIRAGE.jet')]){
    const dest=path.resolve(temporary,baseline.env.BLUSTONE_RESOURCE_ASSET_DIR,pin.name),original=readFileSync(dest),corrupt=Buffer.from(original);corrupt[0]^=1;
    writeFileSync(dest,corrupt);assert.throws(()=>prepareRestorationProfile(baseline,options),/Conflicting/);writeFileSync(dest,original);
    const preferred=path.resolve(temporary,baseline.env.BLUSTONE_PACKAGE_DIR,pin.name);mkdirSync(path.dirname(preferred),{recursive:true});writeFileSync(preferred,'AUTHORED_CONFLICT_ONLY');
    assert.throws(()=>prepareRestorationProfile(baseline,options),/Conflicting/);rmSync(preferred);rmSync(dest);
    assert.throws(()=>prepareRestorationProfile(baseline,options),/Missing/);writeFileSync(dest,original);
  }
  const copiedScript=path.join(temporary,'scripts/profiles/prepare-restoration.mjs');mkdirSync(path.dirname(copiedScript),{recursive:true});
  copyFileSync(path.join(root,'scripts/profiles/prepare-restoration.mjs'),copiedScript);
  const copiedConfigs=path.join(temporary,'config/profiles');mkdirSync(copiedConfigs,{recursive:true});
  for(let i=0;i<sourceFiles.length;i++)writeFileSync(path.join(copiedConfigs,sourceNames[i]+'.json'),sourceBytes[i]);
  const output=path.join(copiedConfigs,'current-restoration.json');
  const inspect=JSON.parse(execFileSync(process.execPath,[copiedScript,'--inspect-only'],{encoding:'utf8'}));
  assert.deepEqual(inspect,candidate);assert.equal(existsSync(output),false,'Inspect-only creates no profile');
  assert.equal(existsSync(path.join(manifests,'restoration-originals.json')),false,'Inspect-only creates no manifest');
  execFileSync(process.execPath,[copiedScript],{stdio:'pipe'});const cliBytes=readFileSync(output);
  execFileSync(process.execPath,[copiedScript],{stdio:'pipe'});assert.deepEqual(readFileSync(output),cliBytes);
  const reviewed=JSON.stringify({...candidate,source:'AUTHORED_DIFFERENT_REVIEWED_CANDIDATE'});writeFileSync(output,reviewed);
  assert.throws(()=>execFileSync(process.execPath,[copiedScript],{stdio:'pipe'}));assert.equal(readFileSync(output,'utf8'),reviewed,'CLI never overwrites a different reviewed candidate');
  // Compiled bootstrap in a separate process proves actual published breadth,
  // without sharing import-time profile state or allocating a saved account.
  const snapshot=profile=>{
    const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_'))),...profile.env,BLUSTONE_STATE_FILE:path.join(temporary,'never-created-state.json')};
    for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_CATALOG_PATH'])env[key]=path.resolve(root,profile.env[key]);
    const code=`const b=await import(${JSON.stringify(pathToFileURL(path.join(root,'dist/src/bootstrap.js')).href)});const t=await import(${JSON.stringify(pathToFileURL(path.join(root,'dist/src/hunter-traces.js')).href)});console.log(JSON.stringify({refs:b.starterReference,inventory:b.starterInventory,birth:b.recruitBirthRanks,exchange:t.HUNTER_TRACE_ITEMS,trace:t.itemReference().trace}));`;
    return JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',code],{cwd:temporary,env,encoding:'utf8'}));
  };
  const old=snapshot(baseline),expanded=snapshot(candidate),oldIDs=new Set(old.refs.map(row=>row.base.id));
  assert.equal(old.refs.filter(row=>row.base.is_source===0).length,14);
  const ordinary=expanded.refs.filter(row=>row.base.is_source===0);assert.equal(ordinary.length,22);
  const additions=ordinary.filter(row=>!oldIDs.has(row.base.id));assert.deepEqual(additions.map(row=>row.base.id).sort(),['007','011','014','016','018','030','048','054']);
  for(const row of additions){assert.ok(row.stat.length);assert.ok(row.stat.every(stat=>stat.hp==='1000'&&stat.atk==='100'&&stat.def==='50'));assert.ok(row.skill.every(skill=>skill.effect.length===0));}
  assert.deepEqual(expanded.inventory,old.inventory,'Newly publishable references do not grant owned Hunters');
  assert.deepEqual(expanded.birth,old.birth);assert.deepEqual(expanded.exchange,old.exchange);assert.deepEqual(expanded.trace,old.trace,'Discovery adds no acquisition/drop/exchange authority');
  console.log('Compiled restoration ordinary references:',ordinary.length,'new vs baseline:',additions.map(row=>row.base.id).join(','));
} finally {
  assert.ok(path.resolve(temporary).startsWith(path.join(path.resolve(tmpdir()),'blustone-restoration-profile-')));rmSync(temporary,{recursive:true,force:true});
}
for(let i=0;i<sourceFiles.length;i++)assert.deepEqual(readFileSync(sourceFiles[i]),sourceBytes[i]);
console.log('Restoration profile:169 exact ordered groups/32 provenance pins/30 additions, coherent1634688+future/idempotence, source preservation and invalid/partial/overflow/missing/corrupt/conflicting refusals passed; inactive.');
