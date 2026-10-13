import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
import {GEM_STAT_KEYS} from "../src/gem-combinations.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8")).env);
const row={id:"AUTHORED_WEAPON1",type:1,rank:1,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"0"])),atk:"10000",atk_up:"2000"};
process.env.BLUSTONE_EQUIPMENT_REFERENCE_JSON=JSON.stringify({"001":[row,{...row,id:"AUTHORED_WEAPON2",rank:2,atk:"40000"},{...row,id:"AUTHORED_ARMOR",type:2},{...row,id:"AUTHORED_ACCESSORY",type:3}]});
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js"),{SEARCH_CAPSULE_ID}=await import("../src/search-capsules.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-rank-hydration-"));
try {
  const sourceFile=path.join(dir,"source.json"),initial=new ServerState("http://localhost",sourceFile);
  const users=Array.from({length:4},(_,i)=>initial.registerGuest({device_id:"rank-hydration"+i},{}).ret_data as any);
  const base=JSON.parse(readFileSync(sourceFile,"utf8"));
  for(const entry of base.gameStates){entry[1].gold=100;entry[1].starter_cards[0].weapon_rank=1;entry[1].starter_cards[0].weapon_level=10;
    entry[1].items=[{inst_id:1,ref_id:SEARCH_CAPSULE_ID,qty:3,lock:0}];entry[1].next_item_inst_id=2;}
  base.guilds=[{id:1,name:"Guild",desc:"",type:2,fc_point_limit:0,region:"EN",emblem_id:"GD_IMG_1",contribution:100,rank:7,gvg_win_cnt:8,gvg_inf_win_cnt:9,
    members:[{pvid:users[1].pvid,role:1,newbie:0,contribution:0,fc_point:0},{pvid:users[0].pvid,role:3,newbie:0,contribution:17,fc_point:0}]}];
  base.guildPending=[{pvid:users[2].pvid,guild_id:1,desc:"",fc_point:0,applied:1}];
  const rankPrices=[{rank:2,attr:1,price_type:2,price:23,item_qty:1,item_ref_id:SEARCH_CAPSULE_ID,card_qty:0}];
  for(const [index,levels] of [[0,undefined],[2,[{level:0,contribution:0},{level:1,contribution:100,equipment_level_up:0}]]] as const) {
    const file=path.join(dir,"state"+index+".json");writeFileSync(file,JSON.stringify(base));
    const options={equipmentRankPrices:rankPrices,...(levels===undefined?{}:{guildLevelBenefits:levels})},state=new ServerState("http://localhost",file,options),auth=users[index];
    const before=readFileSync(file),info=gameResponse(state,"/lobby/GetGuildInfo",auth) as any;
    assert.equal(info.ret_data.my_guild.status,index===0?3:1);assert.deepEqual(info.ret_data.guilds,[{...base.guilds[0],member_cnt:2}]);
    info.ret_data.guilds[0].contribution=0;assert.equal((gameResponse(state,"/lobby/GetGuildInfo",auth) as any).ret_data.guilds[0].contribution,100);
    assert.deepEqual(readFileSync(file),before,"matching INFO hydration is detached and read-only");
    const game=(state as any).gameByPvid.get(auth.pvid),body={...auth,inst_id:String(game.starter_cards[0].inst_id),part:"1",price_type:"2",source_inst_ids:"null"};
    const run=()=>gameResponse(state,"/card_handler/RankUpEquipment",body) as any;
    const old=(state as any).persist;(state as any).persist=()=>{throw new Error("fixture rank write failure");};assert.throws(()=>run(),/write failure/);
    assert.equal(game.gold,100);assert.equal(game.starter_cards[0].weapon_rank,1);assert.deepEqual(readFileSync(file),before);(state as any).persist=old;
    const result=run();assert.equal(result.result_code,1);assert.equal(result.ret_data.user.gold.cur,77,"raw23 fee applies even with absent levels or zero-valued level discount");
    assert.equal(game.starter_cards[0].weapon_rank,2);assert.equal(game.starter_cards[0].weapon_level,10);assert.equal(game.items[0].qty,2);
    const final=JSON.parse(readFileSync(file,"utf8"));assert.deepEqual(final.guilds,[{...base.guilds[0],member_cnt:2}]);assert.deepEqual(final.guildPending,base.guildPending);
    for(const entry of base.gameStates) if(entry[0]!==auth.pvid) assert.deepEqual(final.gameStates.find((row:any)=>row[0]===entry[0]),entry);
    const settled=readFileSync(file),restart=new ServerState("http://localhost",file,options);
    assert.deepEqual((gameResponse(restart,"/lobby/GetGuildInfo",auth) as any).ret_data.guilds,[{...base.guilds[0],member_cnt:2}]);assert.deepEqual(readFileSync(file),settled);
  }
} finally{rmSync(dir,{recursive:true,force:true});}
console.log("Guild rank/hydration: joined and pending INFO cache receipts, raw23 rank fee independent of absent/zero level benefits, material/level preservation, rollback/restart and unrelated state passed.");
