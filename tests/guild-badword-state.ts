import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
import {BADWORD_SOURCE,originalBadwordLocale,originalBadwordMatcher} from "../src/badword-source.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-guild.json"),"utf8")).env);
const {ServerState}=await import("../src/state.js");const {gameResponse}=await import("../src/game-routes.js");
const corpus=readFileSync(repositoryPath(BADWORD_SOURCE.path));
// Select from the pinned corpus without copying or printing its contents.
const blocked=originalBadwordLocale(corpus,"EN").find(row=>/^[a-z]{3,8}$/.test(row.word))!.word;
assert.equal(originalBadwordMatcher(corpus)(blocked),true);
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-badword-"));
try {
  const file=path.join(dir,"state.json"),state=new ServerState("http://localhost",file,{guildCreationMode:"local-gold",guildUpdateMode:"local-manda-free-first",
    guildPrices:[{action:1,price_type:2,price:17},{action:2,price_type:1,price:23}]});
  const auth=state.registerGuest({device_id:"stock-word-filter"},{}).ret_data as any;
  const body={...auth,name:"New Guild",desc:"Updated",type:"1",fc_point_limit:"0",region:"EN",emblem_id:"GD_IMG_1"};
  const before=readFileSync(file),memory=JSON.stringify((state as any).gameByPvid.get(auth.pvid));
  for(const extra of [{name:blocked},{desc:blocked}]) {
    assert.equal((gameResponse(state,"/guild/Found",{...body,...extra}) as any).result_code,2001);
    assert.deepEqual(readFileSync(file),before);assert.equal(JSON.stringify((state as any).gameByPvid.get(auth.pvid)),memory);
  }
  assert.equal((gameResponse(state,"/guild/Found",body) as any).result_code,1);
  const settled=readFileSync(file);
  for(const extra of [{name:blocked},{desc:blocked}]) {
    assert.equal((gameResponse(state,"/guild/Update",{...body,...extra}) as any).result_code,2001);
    assert.deepEqual(readFileSync(file),settled);
  }
  assert.equal((gameResponse(state,"/guild/Update",body) as any).result_code,1);assert.deepEqual(readFileSync(file),settled);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild stock word filter: pinned native merged corpus protects Found and changed Update text before fees/writes, clean retries preserve complete saves; original font/registry gates remain separate.");
