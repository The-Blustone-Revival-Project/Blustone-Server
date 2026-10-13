import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8")).env);
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-gems-"));
const ref={id:"AUTHORED_GUILD_GEM",name:"",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1};
try {
  const source=path.join(dir,"source.json"),initial=new ServerState("http://localhost",source,{gemReferences:[ref]});
  const users=Array.from({length:3},(_,i)=>initial.registerGuest({device_id:"guild-gem"+i},{}).ret_data as any),base=JSON.parse(readFileSync(source,"utf8"));
  for(const entry of base.gameStates){entry[1].gold=100;entry[1].gem=12;entry[1].starter_cards[0].weapon_rank=3;
    entry[1].owned_gems=["9007199254740993","18446744073709551615"].map(inst_id=>({inst_id,ref_id:ref.id,rank:1,level:1,position:0,target_inst_id:"0",ability:"opaque",abilities:null}));}
  base.guilds=[{id:1,name:"Guild",desc:"",type:2,fc_point_limit:0,region:"EN",emblem_id:"GD_IMG_1",contribution:100,rank:7,gvg_win_cnt:8,gvg_inf_win_cnt:9,
    members:[{pvid:users[1].pvid,role:1,newbie:0,contribution:0,fc_point:0},{pvid:users[0].pvid,role:3,newbie:0,contribution:0,fc_point:0}]}];
  base.guildPending=[{pvid:users[2].pvid,guild_id:1,desc:"",fc_point:0,applied:1}];
  for(const index of [0,2]) {
    const file=path.join(dir,"state"+index+".json");writeFileSync(file,JSON.stringify(base));
    const options={gemReferences:[ref],gemDisassemblePrices:[{level:1,price_type:2,price:13}],gemSellPrices:[{rank:1,level:1,price_type:2,price:13}],
      ...(index===2?{guildLevelBenefits:[{level:0,contribution:0},{level:1,contribution:100,gem_level_up:0}]}:{})};
    const state=new ServerState("http://localhost",file,options),auth=users[index],game=(state as any).gameByPvid.get(auth.pvid),target=String(game.starter_cards[0].inst_id);
    const a="9007199254740993",b="18446744073709551615",layout=(weapons:string[])=>({weapons,armors:[0,0],accessories:[0,0]});
    const mount=(weapons:string[])=>gameResponse(state,"/card_handler/EquipGem",{...auth,target_inst_id:target,price_type:2,combination:JSON.stringify(layout(weapons)).replace(/"(\d+)"/g,"$1")}) as any;
    const sell=()=>gameResponse(state,"/gem/Sell",{...auth,inst_id_list:"[9007199254740993,18446744073709551615]"}) as any;
    assert.equal(mount([a,b]).ret_data.user.gold.cur,100,"empty-before mounting is free under either affiliation");
    let bytes=readFileSync(file);assert.equal(sell().result_code,2001,"mounted protection remains independent of affiliation");assert.deepEqual(readFileSync(file),bytes);
    const persist=(state as any).persist,beforeGems=game.owned_gems;(state as any).persist=()=>{throw new Error("fixture swap write failure");};
    assert.throws(()=>mount([b,a]),/write failure/);assert.equal(game.gold,100);assert.equal(game.owned_gems,beforeGems);assert.deepEqual(readFileSync(file),bytes);(state as any).persist=persist;
    assert.equal(mount([b,a]).ret_data.user.gold.cur,74,"swap charges two raw13 quotes, not Guild polish multiplier0");
    bytes=readFileSync(file);assert.equal(mount([b,a]).ret_data.user.gold.cur,74);assert.deepEqual(readFileSync(file),bytes);
    assert.equal(mount(["0","0"]).ret_data.user.gold.cur,48);assert.ok(game.owned_gems.every((row:any)=>row.target_inst_id==="0"&&row.position===0));
    bytes=readFileSync(file);const beforeSale=game.owned_gems;(state as any).persist=()=>{throw new Error("fixture sale write failure");};
    assert.throws(()=>sell(),/write failure/);assert.equal(game.gold,48);assert.equal(game.owned_gems,beforeSale);assert.deepEqual(readFileSync(file),bytes);(state as any).persist=persist;
    assert.equal(sell().ret_data.user.gold.cur,74,"sales retain full raw26 proceeds regardless of polish benefit");
    const settled=readFileSync(file);assert.equal(sell().result_code,2001);assert.deepEqual(readFileSync(file),settled);
    const final=JSON.parse(settled.toString());assert.deepEqual(final.guilds,[{...base.guilds[0],member_cnt:2}]);assert.deepEqual(final.guildPending,base.guildPending);
    for(const entry of base.gameStates) if(entry[0]!==auth.pvid) assert.deepEqual(final.gameStates.find((row:any)=>row[0]===entry[0]),entry);
    const actual=structuredClone(final.gameStates.find((row:any)=>row[0]===auth.pvid)[1]),expected=structuredClone(base.gameStates[index][1]);expected.gold=74;expected.owned_gems=[];assert.deepEqual(actual,expected);
    const restart=new ServerState("http://localhost",file,options);assert.deepEqual((gameResponse(restart,"/lobby/GetGemInven",auth) as any).ret_data,[]);assert.deepEqual(readFileSync(file),settled);
  }
} finally{rmSync(dir,{recursive:true,force:true});}
console.log("Affiliated Gems: joined/no-benefit and pending/zero-polish contexts support free mounts, raw swap/removal/sale, unsafe64 identities, atomic rollback/replay/restart and exact unrelated state preservation.");
