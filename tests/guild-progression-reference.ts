import assert from "node:assert/strict";
import {guildLevelBenefits,guildBenefitStrings,guildContributionPoints,guildContributionRewards,selectedGuildBenefit} from "../src/guild-progression-reference.js";
import {nativeGuildSaleValue} from "../src/equipment-fee.js";
const rows=guildLevelBenefits([{level:0,contribution:0},{level:2,contribution:100,equipment_level_up:900,ap:5},{level:7,contribution:1000,equipment_level_up:0}]);
assert.equal(selectedGuildBenefit(rows,0,"equipment_level_up"),null);
assert.equal(selectedGuildBenefit(rows,99,"equipment_level_up"),null);
assert.deepEqual(selectedGuildBenefit(rows,100,"equipment_level_up"),{mode:1,value:900});
assert.equal(nativeGuildSaleValue(17,selectedGuildBenefit(rows,999,"equipment_level_up")),15,"native per-thousand binary32 multiplier/truncation, not subtraction");
assert.equal(nativeGuildSaleValue(17,selectedGuildBenefit(rows,1000,"equipment_level_up")),0,"present0 differs from missing benefit");
assert.deepEqual(selectedGuildBenefit(rows,100,"ap"),{mode:0,value:5});
assert.equal(nativeGuildSaleValue(17,selectedGuildBenefit(rows,0,"equipment_level_up")),17);
for(const raw of [[],[{level:1,contribution:0}],[{level:0,contribution:0},{level:2,contribution:0}],[{level:0,contribution:0,training:1}],
  [{level:0,contribution:0,ap:-1}],[{level:0,contribution:0,equipment_level_up:"900"}]]) assert.throws(()=>guildLevelBenefits(raw));
assert.deepEqual(guildBenefitStrings({traning:"Authored description"}),{traning:"Authored description"});assert.throws(()=>guildBenefitStrings({training:"Alias"}));
assert.deepEqual(guildContributionPoints({"1":-1,"2":0,"3":1,"4":2}),{"1":-1,"2":0,"3":1,"4":2});assert.throws(()=>guildContributionPoints({"1":1}));
const rewards=[{contribution:100,reward:{gold:1,item_list:[{id:"AUTHORED_ITEM",qty:2}]}}];
assert.deepEqual(guildContributionRewards(rewards,new Set(["AUTHORED_ITEM"])),rewards);
assert.throws(()=>guildContributionRewards([{contribution:0,reward:{}}],new Set()));assert.throws(()=>guildContributionRewards(rewards,new Set()));
console.log("Guild progression references: exact schemas/order/base guard, aggregate threshold selection, null/present-zero distinction, binary32 fee modes, strict signed action points and nonzero mileage/item identity guards passed.");
