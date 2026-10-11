import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const level=[{level:2,price_type:2,price:17,item1_qty:0,item1_ref_id:"",item2_qty:0,item2_ref_id:"",
  item3_qty:0,item3_ref_id:"",item4_qty:0,item4_ref_id:""}];
const rank=[{rank:1,attr:1,price_type:2,price:23,item_qty:0,item_ref_id:"",card_qty:0}];
// Authored quotes verify transport/publication; currency enums remain uninterpreted.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-equipment-prices-"));
try {
  const file=path.join(directory,"state.json");
  const state=new ServerState("http://localhost",file,{equipmentLevelPrices:level,equipmentRankPrices:rank});
  const auth=state.registerGuest({device_id:"equipment-price-owner"},{}).ret_data as any;
  const other=state.registerGuest({device_id:"equipment-price-other"},{}).ret_data as any;
  const before=readFileSync(file);
  const read=(route:string,payload=auth)=>(gameResponse(state,route,payload) as any);
  assert.throws(()=>read("/reference/GetCardEquipmentLevelUpPrice",{}),/authenticated account required/);
  assert.throws(()=>read("/reference/GetCardEquipmentRankUpPrice",{otp:auth.otp,pvid:other.pvid}),/account|identity|PVID|pvid/i);
  assert.deepEqual(read("/reference/GetCardEquipmentLevelUpPrice").ret_data,level);
  assert.deepEqual(read("/reference/GetCardEquipmentRankUpPrice").ret_data,rank);
  const exposed=read("/reference/GetCardEquipmentLevelUpPrice").ret_data;
  exposed[0].price=999; level[0].price=999;
  assert.equal(read("/reference/GetCardEquipmentLevelUpPrice").ret_data[0].price,17);
  for(const route of ["/card_handler/LevelUpEquipment","/card_handler/RankUpEquipment"]) {
    assert.throws(()=>read(route,{}),/authenticated account required/);
    assert.equal(read(route,{...auth,inst_id:"1000001",part:"1",price_type:"2",source_inst_ids:"[]"}).result_code,2001,
      "Quote publication must not imply implemented equipment settlement");
  }
  assert.deepEqual(readFileSync(file),before,"all accounts/games/items/owned ranks and keys must stay byte-identical");
  const restarted=new ServerState("http://localhost",file,{equipmentLevelPrices:[{...level[0],price:17}],equipmentRankPrices:rank});
  assert.equal((gameResponse(restarted,"/reference/GetCardEquipmentLevelUpPrice",auth) as any).ret_data[0].price,17);
  assert.deepEqual(readFileSync(file),before);
  for(const options of [{equipmentLevelPrices:null},{equipmentRankPrices:undefined},{equipmentLevelPrices:[{...level[0],item1_qty:1,item1_ref_id:"UNKNOWN_ITEM"}]},
    {equipmentRankPrices:[rank[0],rank[0]]}]) {
    assert.throws(()=>new ServerState("http://localhost",file,options),TypeError);
    assert.deepEqual(readFileSync(file),before,"invalid startup data must preserve the source save");
  }
  const neutral=new ServerState("http://localhost",file,{equipmentLevelPrices:[],equipmentRankPrices:[]});
  assert.deepEqual((gameResponse(neutral,"/reference/GetCardEquipmentLevelUpPrice",auth) as any).ret_data,[]);
  assert.deepEqual((gameResponse(neutral,"/reference/GetCardEquipmentRankUpPrice",auth) as any).ret_data,[]);
  assert.deepEqual(readFileSync(file),before);
} finally {rmSync(directory,{recursive:true,force:true});}
console.log("Equipment quote state: authenticated immutable native arrays, explicit empty/malformed-data handling, no mock upgrade success, restart and exact save bytes passed; no original prices configured.");
