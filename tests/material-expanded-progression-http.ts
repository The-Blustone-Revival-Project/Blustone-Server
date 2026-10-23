import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {repositoryPath} from '../src/paths.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-expanded-progression-')),file=path.join(directory,'state.json');
const invalid052=path.join(directory,'old052.json'),invalid056=path.join(directory,'old056.json');
const previous={...process.env},clock=Date.now;Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  const baselineFile=repositoryPath('config/profiles/current-e10-expanded-skills-progression.json');
  const profileFile=repositoryPath('config/profiles/current-e10-expanded-character-progression.json');
  const baselineBytes=readFileSync(baselineFile),profileBytes=readFileSync(profileFile);
  const baseline=JSON.parse(baselineBytes.toString('utf8')),profile=JSON.parse(profileBytes.toString('utf8'));
  assert.equal(profile.preparedOnly,true);assert.equal(profile.expectedPackages,210);assert.equal(profile.resourceStamp,baseline.resourceStamp);
  assert.deepEqual(profile.env,{...baseline.env,BLUSTONE_MATERIAL_STAT_PROFILE:'archive-2019-expanded-projection',
    BLUSTONE_HUNTER_MIN_RANK_PROFILE:'expanded-material-catalogue-birth-rank-projection'},'Only the two explicit progression gates change');
  const compiled=import.meta.url.endsWith('.js'),moduleRoot=compiled?'dist/':'',extension=compiled?'js':'ts';
  const seeded=spawnSync(process.execPath,[...(compiled?[]:['--import','tsx']),'--input-type=module','--eval',`
    import assert from 'node:assert/strict';import {copyFileSync,readFileSync} from 'node:fs';
    import {ServerState} from './${moduleRoot}src/state.${extension}';
    import {starterReference} from './${moduleRoot}src/bootstrap.${extension}';
    import {itemReference} from './${moduleRoot}src/hunter-traces.${extension}';
    Date.now=()=>1800000000000;
    const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const auth=[0,1,2].map(i=>state.registerGuest({device_id:'expanded-progression-'+i},{}).ret_data);
    process.env.BLUSTONE_RECRUIT_CARD='049';const bright=state.gachaPremium({...auth[0],cnt:1,item_inst_id:0},{});
    assert.equal(bright.result_code,1);assert.equal(bright.ret_data.card.ref_id,'049');assert.equal(bright.ret_data.card.rank,3);
    for(let i=0;i<auth.length;i++){
      const game=state.gameFor(state.accountFor(auth[i],{}));game.gold=13579+i;game.starter_cards[0].exp=610+i;
      game.starter_cards[0].skill_1_level=7;game.stage_stars['n_01_0'+(i+1)]=i+1;
      const mowgli=game.starter_cards.find(c=>c.ref_id==='002');assert.equal(mowgli.rank,1);mowgli.exp=520+i;
      game.decks[0].list=[mowgli.inst_id,game.starter_cards[0].inst_id,i===0?bright.ret_data.card.inst_id:0,0,0];
    }
    state.persist();
    const paid={};
    for(const [id,target] of [['052',${JSON.stringify(invalid052)}],['056',${JSON.stringify(invalid056)}]]){
      copyFileSync(${JSON.stringify(file)},target);const legacy=new ServerState('http://localhost',target);
      process.env.BLUSTONE_RECRUIT_CARD=id;paid[id]=legacy.gachaPremium({...auth[0],cnt:1,item_inst_id:0},{});
      assert.equal(paid[id].result_code,1);assert.equal(paid[id].ret_data.card.ref_id,id);assert.equal(paid[id].ret_data.card.rank,1);
    }
    console.log(JSON.stringify({auth,refs:starterReference,items:itemReference(),paid,old052Games:JSON.parse(readFileSync(${JSON.stringify(invalid052)},'utf8')).gameStates}));
  `],{cwd:repositoryPath(),env:{...process.env,...baseline.env},encoding:'utf8',timeout:30_000,maxBuffer:4*1024*1024});
  assert.equal(seeded.status,0,seeded.stderr);const old=JSON.parse(seeded.stdout),auth=old.auth[0];
  const before=readFileSync(file),games=JSON.parse(before.toString('utf8')).gameStates;
  Object.assign(process.env,profile.env);delete process.env.BLUSTONE_STATE_FILE;
  const {createApp}=await import('../src/server.js'),{ServerState}=await import('../src/state.js');
  const ctx=createApp({baseUrl:'http://127.0.0.1',stateFile:file});
  assert.deepEqual(readFileSync(file),before,'Mode selection must not migrate any of three earned games');
  for(const incompatible of [invalid052,invalid056]){
    const bytes=readFileSync(incompatible);
    assert.throws(()=>new ServerState('http://localhost',incompatible),/minimum-rank projection lacks an owned rank\/awakening row/);
    assert.deepEqual(readFileSync(incompatible),bytes,'Existing rank1 ownership is evidence, not a migration target');
  }
  assert.throws(()=>new ServerState('http://localhost',file,{quickAdvancementMode:'local-owned-tickets'}),/requires the catalogue minimum-rank profile/);
  assert.deepEqual(readFileSync(file),before,'The partial catalogue does not authorize quick-advancement tickets');
  server=createServer(ctx.app);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
  const base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const key=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=(bytes:Buffer)=>crypto.createHmac('sha384',key).update(bytes).digest('base64');assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route:string,values:Record<string,string>={})=>{
    const plain=Buffer.from(String(new URLSearchParams({...values,pvid:String(auth.pvid),otp:String(auth.otp)})));
    const cipher=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});
    assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/^application\/octet-stream/);
    const decipher=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const bytes=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
    assert.equal(response.headers.get('pv-signature'),sign(bytes));return JSON.parse(bytes.toString('utf8'));
  };
  assert.equal((await secure('/lobby/Enter')).result_code,1);assert.deepEqual(JSON.parse(readFileSync(file,'utf8')).gameStates,games);
  const readsBefore=readFileSync(file),reference=await secure('/reference/GetCard');assert.equal(reference.result_code,1);const refs=reference.ret_data;
  assert.equal(refs.length,29);assert.equal(old.refs.length,29);
  const births:Record<string,number>={'021':2,'024':2,'039':3,'041':3,'052':4,'056':4};
  const archiveIds=new Set(['021','024','039','041','052']);
  const lines=readFileSync(repositoryPath('resources/reference/archived-hunter-database-2019.tsv'),'utf8').trim().split(/\r?\n/);
  const unquote=(v:string)=>v.replace(/^"|"$/g,''),headers=lines.shift()!.split('\t').map(unquote);
  const observations=lines.map(line=>Object.fromEntries(line.split('\t').map(unquote).map((value,i)=>[headers[i],value])));
  const fields:Record<string,string>={hp:'hp',atk:'atk',def:'def',spd:'speed',crt_chance:'crit',crt_dmg:'crit_damage',penetration:'penetration',
    block_chance:'block',block_dec_dmg:'block_damage_reduction',attr_enhance:'element_enhance',attr_resist:'element_resistance',hp_regen:'hp_regen'};
  for(const row of refs){
    const prior=old.refs.find((r:any)=>r.base.id===row.base.id),id=row.base.id,birth=births[id];
    if(!birth){assert.deepEqual(row,prior,'Original22plusSienna stay byte-value exact');continue;}
    assert.equal(row.stat[0].rank,birth);assert.equal(row.stat[0].awk_step,0);
    assert.ok(row.stat.filter((stat:any)=>stat.awk_step===0).every((stat:any)=>stat.rank>=birth));
    assert.deepEqual({...row,stat:prior.stat},prior,'Only selected stat rows change; expanded skill graphs and all other metadata remain exact');
    const kept=prior.stat.filter((stat:any)=>stat.awk_step!==0||stat.rank>=birth);
    if(!archiveIds.has(id)){assert.deepEqual(row.stat,kept,'Genovia has no archive observation and keeps neutral numbers');continue;}
    const matching=observations.filter(observation=>observation.catalog_id===id);assert.equal(matching.length,1);
    const observation=matching[0];assert.equal(observation.fetch_status,'ok');assert.equal(observation.level,'not shown');assert.equal(observation.gear_state,'not established');
    assert.deepEqual(row.stat,kept.map((stat:any)=>({...stat,...Object.fromEntries(Object.entries(fields).map(([wire,column])=>[wire,observation[column]]))})),
      'Projected displayed archive numbers preserve every retained row selector/growth field');
  }
  const items=await secure('/reference/GetItem');assert.equal(items.result_code,1);
  assert.deepEqual(items.ret_data.trace,old.items.trace,'Minimum-rank navigation does not add acquisition/drop authority');
  for(const item of items.ret_data.item){
    const prior=old.items.item.find((row:any)=>row.id===item.id);assert.ok(prior,'No item reference or attachment is silently added');
    const id=/^local_library_trace_(\d{3})$/.exec(item.id)?.[1];
    assert.deepEqual(item,id&&births[id]?{...prior,rank:births[id]}:prior,'Only the existing derived Library rank follows a selected new minimum');
  }
  assert.equal(items.ret_data.item.length,old.items.item.length);
  const owner=games.find(([pvid]:any)=>pvid===auth.pvid)[1],owned=[...owner.starter_cards,...owner.recruited_cards];
  assert.deepEqual((await secure('/world/RefreshInven',{card_inst_list:JSON.stringify(owned.map(card=>card.inst_id))})).ret_data.card,owned);
  assert.deepEqual(JSON.parse(readFileSync(file,'utf8')).gameStates,games);assert.deepEqual(readFileSync(file),readsBefore);
  process.env.BLUSTONE_RECRUIT_CARD='052';const paid=await secure('/shop/GachaPremium',{cnt:'1',item_inst_id:'0'});
  const expected=structuredClone(old.paid['052']);expected.ret_data.card.rank=4;
  for(const slot of [2,3,4])expected.ret_data.card[`skill_${slot}_level`]=1;
  if(Object.hasOwn(expected,'data'))expected.data=structuredClone(expected.ret_data);
  assert.deepEqual(paid,expected,'Same native single receipt and fee; only explicit birth rank/initial eligible skill keys change');
  const expectedGames=structuredClone(old.old052Games),newOwner=expectedGames.find(([pvid]:any)=>pvid===auth.pvid)[1];
  const newCard=newOwner.recruited_cards.find((card:any)=>card.ref_id==='052');newCard.rank=4;
  for(const slot of [2,3,4])newCard[`skill_${slot}_level`]=1;
  newOwner.card_book.find((row:any)=>row.ref_id==='052').rank=4;
  assert.deepEqual(JSON.parse(readFileSync(file,'utf8')).gameStates,expectedGames,'No extra grant, earned inflation or peer mutation accompanies the actual paid052');
  assert.equal(newOwner.recruited_cards.length,owner.recruited_cards.length+1);assert.equal(newOwner.gacha_free_qty,owner.gacha_free_qty-30);
  const post052=readFileSync(file);new ServerState(base,file);assert.deepEqual(readFileSync(file),post052,'Valid new rank4 Windblade cold-loads without rewriting');
  process.env.BLUSTONE_RECRUIT_CARD='056';const genovia=await secure('/shop/GachaPremium',{cnt:'1',item_inst_id:'0'});
  assert.equal(genovia.result_code,1);assert.equal(genovia.ret_data.card.ref_id,'056');assert.equal(genovia.ret_data.card.rank,4);
  assert.deepEqual(Object.keys(genovia.ret_data.card).sort(),Object.keys(old.paid['056'].ret_data.card).sort());
  const post056=JSON.parse(readFileSync(file,'utf8')),last=post056.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1];
  assert.equal(last.recruited_cards.length,owner.recruited_cards.length+2);assert.equal(last.gacha_free_qty,newOwner.gacha_free_qty-30);
  assert.deepEqual(post056.gameStates.slice(1),games.slice(1));const settled=readFileSync(file);new ServerState(base,file);assert.deepEqual(readFileSync(file),settled);
  assert.deepEqual(readFileSync(profileFile),profileBytes);assert.deepEqual(readFileSync(baselineFile),baselineBytes);
}finally{
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(previous,key))delete process.env[key];Object.assign(process.env,previous);
  Date.now=clock;rmSync(directory,{recursive:true,force:true});
}
console.log('Expanded progression encryptedHTTP: exact210policy delta, five historical stat projections/six community birth grades, prior22+Sienna unchanged, three earned games/Bright3/Mowgli1 preserved, real paid052/056 rank4 same30fee/shape/no extra grants, rank1captures refused without rewrite, validrank4 restart and no quick-ticket authority passed.');
