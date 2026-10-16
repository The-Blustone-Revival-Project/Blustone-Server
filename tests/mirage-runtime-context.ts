import assert from 'node:assert/strict';
import {mirageRuntimeContext} from '../src/mirage-runtime-context.js';
import {createLocalGameState} from '../src/game.js';
import {cardInstance,starterReference} from '../src/bootstrap.js';
import {requireMirageCombatCache,type MirageCache} from '../src/mirage-cache.js';

const reference=starterReference.find(row=>row.base.id==='002')!;
const rank=reference.stat.find(row=>row.awk_step===0)!.rank;
const card=cardInstance(1000001,'002',rank);card.mirage_remain_hp=7777;
const game=createLocalGameState();game.starter_cards=[card];game.recruited_cards=[];
const enemy={ref_id:'002',hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:rank>=2?1:0,skill_3_level:rank>=3?1:0,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0};
const cache:MirageCache={entry:[{id:1000001,mirage_remain_hp:7777}],
  inst_base:{bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',new_record:0,floor:1,stair:1,state:1,deck:['1000001'],
    tier_percent:0,highest:1,revive_price:0,begin_ltime:1},inst_enemy:[enemy],
  ref_stair:{res_prefix:'MRG',res_postfix_list:['002'],list:[{grade:0,balance:10000}]},
  ref_hero:{bonus:0,end_ltime:200,cur:[],next:[]}};
const before=structuredClone({game,cache}),context=mirageRuntimeContext(game,cache,100);
assert.equal(context.owned.get(1000001)!.char_id,reference.base.char_id);
assert.equal(context.commitments.get(1000001),7777);
assert.deepEqual([...context.readyEnvironments],['2','15']);
assert.equal(context.environments.get('2'),'STI002');assert.equal(context.environments.get('15'),'STI002');
assert.equal(context.stageBackgroundPrefixes!.size,0);
for(const name of ['MRG002','MIRAGE_BG_G','BG_M_INGAME','STI002_A1','STI002_A01'])assert.ok(context.resources.has(name));
assert.equal(context.resources.has('002'),false);assert.equal(context.dialogueIds.size,0);
assert.equal(context.enemySupported(enemy),true);assert.deepEqual(requireMirageCombatCache(cache,context),cache);
for(const patch of [{ref_id:'UNKNOWN'},{rank:0},{rank:6},{rank_up_cnt:rank},{exp:2901},{exp:-1},
  {overcome_cnt:1},{skill_1_level:0},{skill_1_level:51},{skill_1_level:1.5}])
  assert.equal(context.enemySupported({...enemy,...patch}),false);
const wrongHp=structuredClone(cache);wrongHp.entry[0].mirage_remain_hp=10000;
assert.throws(()=>mirageRuntimeContext(game,wrongHp,100),/entry HP/);
const unowned=structuredClone(cache);unowned.entry[0].id=1000002;
assert.throws(()=>mirageRuntimeContext(game,unowned,100),/entry HP/);
const duplicates=structuredClone(game);duplicates.recruited_cards=[{...card}];
assert.throws(()=>mirageRuntimeContext(duplicates,cache,100),/identity/);
assert.throws(()=>mirageRuntimeContext(game,cache,NaN),/clock/);
assert.throws(()=>mirageRuntimeContext(game,{...cache,entry:[]},100),/Unrepresented/);
const unenrolled=structuredClone(game);unenrolled.starter_cards[0].mirage_remain_hp=1000;
const noEntries=mirageRuntimeContext(unenrolled,{...cache,entry:[]},100);
assert.equal(noEntries.commitments.size,0,'Carried HP alone never invents enrollment');
unenrolled.starter_cards[0].mirage_remain_hp=-1;
assert.equal(mirageRuntimeContext(unenrolled,{...cache,entry:[]},100).commitments.size,0);
(context.readyEnvironments as Set<string>).clear(); // Detached registry per call.
assert.deepEqual([...mirageRuntimeContext(game,cache,100).readyEnvironments],['2','15']);
assert.deepEqual({game,cache},before);
console.log('Mirage runtime context: pinned original asset/ENV/layer closure, canonical families, exact real owned HP, ordinary enemy guards, no inferred enrollment or mutations passed.');
