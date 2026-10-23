import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const audit=spawnSync(process.platform==='win32'?'python':'python3',['-B',path.join(root,'scripts/resources/audit-later-episodes.py')],
  {cwd:root,encoding:'utf8',timeout:30000,maxBuffer:3*1024*1024});
assert.equal(audit.status,0,audit.stderr);const report=JSON.parse(audit.stdout);
assert.equal(report.season_sha256,'c5d70b11fbbc5c38ba608bfd73f45a50213ca7686aa8d0f32ab96a25e66f4bb0');
assert.equal(report.actor_table_sha256,'f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56');
assert.equal(report.environment_table_sha256,'0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c');
assert.equal(report.dialogue_pack_sha256,'a79ea5c803b1dc747a052e5a438c521e4e5617932d67990d6ec4d44e75a3a3c0');
assert.deepEqual(report.chapters.map(c=>[c.id,c.stories,c.declared_combats,c.combats,c.dialogs.length]),[
  ['E11',8,2,2,10],['E12',7,2,2,9],['E13',8,3,5,13],['E14',7,2,2,9],
  ['E15',8,2,2,10],['E16',9,4,4,13],['E17',9,4,6,15],['E18',5,0,0,5],
]);
assert.equal(report.dialogues,84);assert.equal(report.reachable_nodes,2027);assert.equal(report.combat_count,23);
assert.ok(report.chapters.every(c=>c.dialogs.every(d=>d.nodes===d.reachable)));
assert.deepEqual(report.shared_loss_dialogues.map(d=>[d.name,d.nodes,d.reachable]),[['EP_0000A',28,28],['EP_0000B',22,22]]);
const descriptors=report.chapters.flatMap(c=>c.combat_descriptors);
assert.deepEqual(descriptors.filter(d=>!d.directly_declared).map(d=>d.id).sort(),['CB1304','CB1305','CB1704','CB1705']);
assert.equal(descriptors.find(d=>d.id==='CB1303').lose_dialog,'EP_2007B','Original outcome can continue a scripted chain regardless of battle result');
const candidate=read('config/profiles/current-later-episodes.json'),selected=new Set(candidate.env.BLUSTONE_PACKAGE_NAMES.split(','));
assert.equal(selected.size,280);
assert.equal(Object.keys(report.literal_resource_owners).length,47,'45 entry/outcome literals plus two shared-loss literals');
for(const owners of Object.values(report.literal_resource_owners)) {
  assert.equal(owners.length,1,'Scoped original literal owner is unambiguous');assert.ok(selected.has(owners[0]));
}
assert.deepEqual(report.literal_resource_owners.CUTIN_E1801,['CUT_E1801.jet']);
assert.deepEqual(report.literal_resource_owners.CUTIN_E1802,['CUT_E1801.jet']);
assert.deepEqual(report.literal_resource_owners.CUTIN003,['CUT_002.jet']);
assert.deepEqual(report.literal_resource_owners.N010_BG,['N010.jet']);
assert.deepEqual(report.literal_resource_owners.BG011_1,['DIAL_BG011.jet']);
for(const [type,id] of report.actors) {
  if(type==='Char')for(const suffix of ['','_Q','_EFT','_SND'])assert.ok(selected.has('C'+id+suffix+'.jet'));
  else {assert.equal(type,'NPC');assert.ok(selected.has('N'+id+'.jet'));}
}
const monsterOwners=Object.fromEntries(read('resources/reference/monster-art-namespaces.json').packs.flatMap(pack=>Object.keys(pack.namespaces).map(id=>[id,pack.package])));
const environments={STI001:'ST001.jet',STI003:'ST003.jet',STI007:'ST007.jet',STI099:'ST099.jet',STI901:'ST901.jet',STI902:'ST902.jet'};
for(const descriptor of descriptors) {
  assert.ok(selected.has(environments[descriptor.environment_prefix]));
  if(descriptor.game_res_id==='7')assert.equal(descriptor.environment_prefix,'STI001');
  if(descriptor.game_res_id==='200')assert.equal(descriptor.environment_prefix,'STI007');
  for(const actor of descriptor.actor_bindings) {
    const owner=actor.res_id.startsWith('M')?monsterOwners[actor.res_id]:actor.res_id+'.jet';
    assert.ok(owner&&selected.has(owner),'Every fixed actor has selected original art');
    if(actor.res_id==='C509')assert.equal(actor.ref_id,'009');
    if(actor.res_id==='C510')assert.equal(actor.ref_id,'010');
  }
}
const inspect=spawnSync(process.platform==='win32'?'python':'python3',['-B','-c',`
import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('j','scripts/resources/jet-index.py');j=importlib.util.module_from_spec(s);s.loader.exec_module(j)
result={}
for name in ['M100.jet','M014.jet','N502.jet','CUT_E1801.jet','ST001.jet','ST003.jet','ST007.jet','ST099.jet','ST901.jet','ST902.jet']:
 data=(Path('resources/runtime/assets')/name).read_bytes();idx=j.index_jet(data)
 row={'exact_eof':idx['exact_eof']==len(data),'names':[r['name'] for r in idx['resources']]}
 if name=='M100.jet':
  at=next(r for r in idx['resources'] if r['name']=='M100_R1')['atprojection']
  row.update(at_supported=at['supported'],sprite=at['frames'][0]['sprite_name'],sprite_projection=at['frames'][0]['sprite_projection_supported'])
 result[name]=row
print(json.dumps(result))`],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
assert.equal(inspect.status,0,inspect.stderr);const indexed=JSON.parse(inspect.stdout);
assert.ok(Object.values(indexed).every(row=>row.exact_eof));
for(const [prefix,owner] of Object.entries(environments))assert.ok(indexed[owner].names.some(name=>name.startsWith(prefix)));
assert.ok(indexed['N502.jet'].names.includes('N502_DLG01'));
assert.ok(indexed['CUT_E1801.jet'].names.includes('CUTIN_E1802'));
assert.equal(indexed['M100.jet'].at_supported,true);assert.equal(indexed['M100.jet'].sprite,'M100_R01');
assert.equal(indexed['M100.jet'].sprite_projection,false,'Keep bounded host S2 auxiliary-layout limitation explicit; no fabricated sprite alias');
console.log('Later Episode closure:61 stories/84 entry-outcome XMLs/2027 nodes plus50 shared-loss nodes,23 battles including4 transitive stages,47 exact literal owners, original actor/environment/aggregate bindings and selected280 art passed; native play remains unverified.');
