import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8")).env);
const equipment={id:"AUTHORED_WEAPON",type:1,rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),atk:"10000",atk_up:"2000"};
process.env.BLUSTONE_EQUIPMENT_REFERENCE_JSON=JSON.stringify({"001":[equipment,{...equipment,id:"AUTHORED_ARMOR",type:2},{...equipment,id:"AUTHORED_ACCESSORY",type:3}]});
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-progression-"));
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file);
  const auth=initial.registerGuest({device_id:"guild-gym-member"},{}).ret_data as any,peer=initial.registerGuest({device_id:"guild-gym-leader"},{}).ret_data as any;
  const outsider=initial.registerGuest({device_id:"guild-gym-unaffiliated"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8"));saved.gameStates[0][1].gold=100;saved.gameStates[0][1].starter_cards[0].weapon_level=1;
  saved.guilds=[{id:1,name:"Guild",desc:"",type:1,fc_point_limit:0,region:"EN",emblem_id:"GD_IMG_1",contribution:100,rank:7,gvg_win_cnt:8,gvg_inf_win_cnt:9,
    members:[{pvid:peer.pvid,role:1,newbie:0,contribution:0,fc_point:0},{pvid:auth.pvid,role:3,newbie:0,contribution:0,fc_point:0}]}];
  writeFileSync(file,JSON.stringify(saved));
  const levels=[{level:0,contribution:0},{level:1,contribution:100,equipment_level_up:900}],options={guildLevelBenefits:levels,
    guildBenefitStrings:{equipment_level_up:"Authored equipment description"},guildContributionPoints:{"1":1,"2":2,"3":3,"4":4},
    guildContributionRewards:[{contribution:100,reward:{gold:1}}],equipmentLevelPrices:[{level:2,price_type:2,price:17,item1_qty:0,item1_ref_id:"",item2_qty:0,item2_ref_id:"",item3_qty:0,item3_ref_id:"",item4_qty:0,item4_ref_id:""}]};
  const state=new ServerState("http://localhost",file,options),bytes=readFileSync(file),game=(state as any).gameByPvid.get(auth.pvid);
  const routes=["GetGuildLevelBenefits","GetGuildLevelBenefitsStr","GetGuildContributionPoints","GetGuildContributionReward"];
  const unconfigured=new ServerState("http://localhost",file);
  for(const route of routes){assert.equal((gameResponse(unconfigured,"/reference/"+route,auth) as any).result_code,2001);assert.throws(()=>gameResponse(state,"/reference/"+route,{}),/authenticated/);}
  for(const route of routes) assert.deepEqual((gameResponse(unconfigured,"/reference/"+route,outsider) as any).ret_data,
    route==="GetGuildLevelBenefitsStr"||route==="GetGuildContributionPoints"?{}:[],"unaffiliated bootstrap keeps canonical empty success without fabricated metadata rows");
  assert.deepEqual((gameResponse(state,"/reference/GetGuildLevelBenefits",auth) as any).ret_data,levels);
  levels[1].equipment_level_up=1;const response=gameResponse(state,"/reference/GetGuildLevelBenefits",auth) as any;assert.equal(response.ret_data[1].equipment_level_up,900);
  response.ret_data[1].equipment_level_up=0;assert.equal((gameResponse(state,"/reference/GetGuildLevelBenefits",auth) as any).ret_data[1].equipment_level_up,900);
  assert.deepEqual(readFileSync(file),bytes,"reference reads and input/response mutations cannot change a save or table");
  const body={...auth,inst_id:String(game.starter_cards[0].inst_id),part:"1",price_type:"2",source_inst_ids:"null"};
  assert.equal((gameResponse(unconfigured,"/card_handler/LevelUpEquipment",body) as any).result_code,2001);
  assert.equal((gameResponse(state,"/card_handler/RankUpEquipment",body) as any).result_code,2001);
  const result=gameResponse(state,"/card_handler/LevelUpEquipment",body) as any;assert.equal(result.result_code,1);assert.equal(result.ret_data.user.gold.cur,85);
  assert.equal(game.starter_cards[0].weapon_level,2,"Guild aggregate100 qualifies despite personal contribution0");
  const final=JSON.parse(readFileSync(file,"utf8"));assert.deepEqual(final.guilds,[{...saved.guilds[0],member_cnt:2}]);assert.deepEqual(final.gameStates[1],saved.gameStates[1]);
  const restart=new ServerState("http://localhost",file,{...options,guildLevelBenefits:[{level:0,contribution:0},{level:1,contribution:100,equipment_level_up:900}]});
  assert.equal((gameResponse(restart,"/reference/GetGuildContributionReward",auth) as any).ret_data[0].reward.gold,1);
  const settled=readFileSync(file);assert.equal((gameResponse(restart,"/guild/ReceiveContributionReward",auth) as any).result_code,2001);assert.equal((gameResponse(restart,"/guild/Donate",{...auth,amount:"1000"}) as any).result_code,2001);assert.deepEqual(readFileSync(file),settled);
} finally{rmSync(dir,{recursive:true,force:true});}
console.log("Guild progression state: immutable configured references, authenticated no-mock/missing-data refusal, aggregate-derived affiliated level fee, unclosed rank/donation/claim gates, unchanged Guild/peer state and restart passed.");
