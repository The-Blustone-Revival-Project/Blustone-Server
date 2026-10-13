import assert from "node:assert/strict";
import {GVG_CARD_STATS,gvgCardSkillLevels,parseGvgInstance,parseGvgInstanceJson} from "../src/gvg-instance.js";
// Authored decoder probes, not original stats, participation or Hunter grants.
const card={...Object.fromEntries(GVG_CARD_STATS.map(key=>[key,"1.25"])),ref_id:"AUTHORED",skin_id:"",skill_level:"[1,2,3]",
  level:2,overcome_cnt:-1,cp:-2,awk_step:1,awk_overcome:0,rank:3};
const data={enemy_guild_id:7,inf_gvg:1,auto_register:0,
  user:{guild_id:6,total_cp:20,offense_point:3,defense_point:4,commander:"18446744073709551615"},
  card_list:[card,{...card,enemy_camp_id:"ENEMY",remain_hp:5000}],
  deployed_list:[{camp_id:"A",order:"01",card_1:"AUTHORED",card_2:"",card_3:"",card_4:""}]};
const raw={result_code:1,ret_data:data},bytes=JSON.stringify(raw),decoded=parseGvgInstance(raw);
assert.deepEqual(decoded,data);assert.equal(decoded.deployed_list[0].order,"01");
assert.equal(Object.hasOwn(decoded.card_list[0],"remain_hp"),false,"Optional native defaults are not fabricated into supplied wire rows");
assert.deepEqual(gvgCardSkillLevels(decoded.card_list[0].skill_level),[1,2,3]);
decoded.card_list[0].hp="999";decoded.user.guild_id=0;decoded.deployed_list[0].card_1="changed";
assert.equal(JSON.stringify(raw),bytes,"Decoded battle snapshot never aliases source or owned inventory");
const capture=bytes.replace('"commander":"18446744073709551615"','"commander":18446744073709551615');
assert.equal(parseGvgInstanceJson(capture).user.commander,"18446744073709551615");
assert.throws(()=>parseGvgInstance(JSON.parse(capture)),/uint64/,"Already rounded numeric identities refuse");
assert.throws(()=>parseGvgInstanceJson(capture.replace('18446744073709551615','18446744073709551616')),/uint64/);
assert.throws(()=>parseGvgInstanceJson(capture.replace('18446744073709551615','1e20')),/token/);
assert.equal(parseGvgInstance({...raw,ret_data:{...data,user:{...data.user,commander:1}}}).user.commander,"1");
const empty=parseGvgInstance({...raw,ret_data:{...data,card_list:[],deployed_list:[]}});
assert.deepEqual(empty.card_list,[]);assert.deepEqual(empty.deployed_list,[]);
for(const key of Object.keys(data)){
  const missing:any=structuredClone(data);delete missing[key];assert.throws(()=>parseGvgInstance({...raw,ret_data:missing}));
}
for(const patch of [{enemy_guild_id:-1},{inf_gvg:true},{inf_gvg:256},{auto_register:256},
  {user:{...data.user,total_cp:-1}},{user:{...data.user,commander:"01"}},{user:{...data.user,ap:20}}])
  assert.throws(()=>parseGvgInstance({...raw,ret_data:{...data,...patch}}));
assert.equal(parseGvgInstance({...raw,ret_data:{...data,inf_gvg:255}}).inf_gvg,255,"Native byte is not assumed boolean");
for(const patch of [{level:0x8000_0000},{cp:0x8000_0000},{awk_step:-1},{rank:-1},{skill_level:[1]},
  {skill_level:"[1,-1]"},{skill_level:"{}"},{hp:1},{hp:"NaN"},{hp:"1e40"},{hp:""},{hp:"0x10"},
  {ref_id:"bad\ud800"},{inst_id:1000001},{enemy_camp_id:1},{remain_hp:0x8000_0000}])
  assert.throws(()=>parseGvgInstance({...raw,ret_data:{...data,card_list:[{...card,...patch}]}}));
assert.deepEqual(gvgCardSkillLevels("[]"),[],"No guessed five-skill default");
for(const patch of [{order:1},{card_1:1000001},{cards:["AUTHORED"]},{camp_id:null}])
  assert.throws(()=>parseGvgInstance({...raw,ret_data:{...data,deployed_list:[{...data.deployed_list[0],...patch}]}}));
const sparse=new Array(1);assert.throws(()=>parseGvgInstance({...raw,ret_data:{...data,card_list:sparse}}));
const inherited=Object.create(card);assert.throws(()=>parseGvgInstance({...raw,ret_data:{...data,card_list:[inherited]}}));
assert.throws(()=>parseGvgInstance({...raw,result_code:2001}));
assert.throws(()=>parseGvgInstance({...raw,ret_data:{gvg:data}}));
assert.throws(()=>parseGvgInstance(Object.create(raw)),/envelope/);
let getterCalled=false;
const accessor={ret_data:data};Object.defineProperty(accessor,"result_code",{enumerable:true,get(){getterCalled=true;return 1;}});
assert.throws(()=>parseGvgInstance(accessor),/envelope/);assert.equal(getterCalled,false,"Reject before invoking an outer accessor");
assert.deepEqual(parseGvgInstance({...raw,protocol_code:0}),data,"Ordinary JSON envelope metadata is allowed");
assert.equal(JSON.stringify(raw),bytes);
console.log("GvG instance snapshot: exact battle-card versus owned-ID grammar, string stat/skill/deck formats, full64 commander capture, signed/unsigned/byte domains, optional preservation, detached rows and incomplete/refused admission passed; no enrollment.");
