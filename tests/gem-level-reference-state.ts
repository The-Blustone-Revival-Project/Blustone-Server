import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-gem-level-ref-"));
try {
  const file=path.join(dir,"state.json"),row={level:2,price_type:2,price:17,possibility:12.5,failed_compensation:.375,add_sub_ability:true};
  const supplied=[structuredClone(row)],state=new ServerState("http://localhost",file,{gemLevelPrices:supplied});
  const auth=state.registerGuest({device_id:"gem-level-ref"},{}).ret_data as any;
  const before=readFileSync(file),read=()=>gameResponse(state,"/reference/GetGemLevelUpPrice",auth) as any;
  assert.throws(()=>gameResponse(state,"/reference/GetGemLevelUpPrice",{}),/authenticated/);
  supplied[0].price=999;assert.deepEqual(read().ret_data,[{...row,add_sub_ability:1}]);
  read().ret_data[0].possibility=0;assert.equal(read().ret_data[0].possibility,12.5,"raw double not rescaled or mutable");
  assert.equal((gameResponse(state,"/gem/LevelUp",{...auth,inst_id:"1",max_tries:"7"}) as any).result_code,2001,"supplied prices do not invent outcome/growth/roll laws");
  assert.deepEqual(readFileSync(file),before);
  const restarted=new ServerState("http://localhost",file,{gemLevelPrices:[row]});
  assert.deepEqual((gameResponse(restarted,"/reference/GetGemLevelUpPrice",auth) as any).ret_data,read().ret_data);assert.deepEqual(readFileSync(file),before);
  assert.throws(()=>new ServerState("http://localhost",file,{gemLevelPrices:[row,{...row,price_type:1}]}),/Duplicate/);
  assert.deepEqual(readFileSync(file),before);
  const baseline=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(baseline,"/reference/GetGemLevelUpPrice",auth) as any).ret_data,[]);assert.deepEqual(readFileSync(file),before);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Gem upgrade references: authenticated immutable exact raw chance/compensation rows, level-only ambiguity refusal, no guessed upgrade outcomes and save-preserving restart passed.");
