import { repositoryPath } from "../src/paths.js";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["001", "002", "003", "004", "006", "CB0003_C001", "CB0001_M01"];
function inProfile(mode: string, script: string) {
  const run = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: serverRoot, encoding: "utf8", env: { ...process.env, BLUSTONE_ACTIVE_SKILLS: mode },
  });
  assert.equal(run.status, 0, `${mode}: ${run.stderr}`);
  return run.stdout;
}
// These fingerprints were captured before adding episode-actives. They guard
// complete legacy publication, including metadata and secondary effect fields.
const oldPublicationHashes = {
  neutral: "087f90688c116c7fa67832bbbfe1853c8fc6c4561db36e3a8d0bb06db6a10a66",
  fixture: "e6000b6c7f80edfe38084056408ef3b5d4ff3aafe2fc210f95710d068dd14bc0",
  "episode-followups": "012403fa307effbcdb0b871d8cd4382f31ee004a1292c5444b29558f79e55179",
};
const oldProfiles: Record<string, Record<string, ReturnType<typeof fixtureSkillSlots>>> = {};
for (const [mode, hash] of Object.entries(oldPublicationHashes)) {
  const json = inProfile(mode, `
    const {fixtureSkillSlots}=await import('./src/skills.ts');
    console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(ids)}.map(id=>[id,fixtureSkillSlots(id)]))));
  `).trim();
  assert.equal(createHash("sha256").update(json).digest("hex"), hash, `${mode}: opt-in mode must leave old publication unchanged`);
  oldProfiles[mode] = JSON.parse(json);
}
process.env.BLUSTONE_ACTIVE_SKILLS = "episode-actives";
const { fixtureSkillSlots } = await import("../src/skills.js");

type OriginalActor = {
  id: string; ref_id: string; res_id: string;
  skill: Array<{ type: number; target_rank: number; cool_time: number; cost: number; crt_chance: number;
    effect: Array<Record<string, unknown>> }>;
};
const originalFile = repositoryPath("resources", "reference", "episodes", "EPISODE_STAT_ACTORS.json");
let actors: OriginalActor[] | undefined;
if (existsSync(originalFile)) {
  const sourceBytes = readFileSync(originalFile);
  assert.equal(createHash("sha256").update(sourceBytes).digest("hex"),
    "f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56", "source oracle must remain the pinned original export");
  actors = JSON.parse(sourceBytes.toString("utf8"));
}
const sourceIds = { "001": "CB0003_C001", "003": "CB0003_C003", "004": "EVCB0201_004" } as const;
const tupleFields = ["effect_type", "target_type", "target_stat", "refer_target_type",
  "refer_target_stat", "base_number", "duration", "interval"] as const;
for (const id of ids) {
  const slots = fixtureSkillSlots(id);
  assert.deepEqual(slots.map(row => row.type), [1, 2, 3, 4, 5], `${id}: mandatory native keys`);
  assert.deepEqual(slots.map(row => row.target_rank), [1, 2, 3, 4, 5], `${id}: preserve rank admission`);
  assert.deepEqual(slots.slice(1), oldProfiles["episode-followups"][id].slice(1), `${id}: retain selected follow-up and inert passives`);
  if (!(id in sourceIds)) {
    assert.deepEqual(slots, oldProfiles["episode-followups"][id], `${id}: no unsupported or scripted-namespace active substitution`);
    continue;
  }
  const active = slots[0];
  assert.ok(active.effect.length > 0);
  assert.equal(active.effect.length, id === "001" ? 2 : 1, "preserve full selected active vector, including Lantern's secondary result");
  assert.deepEqual(active.effect.map(row => row.serial), id === "001" ? [1, 2] : [1], "local serial policy must distinguish result rows");
  assert.equal(active.cool_time, 5000);
  assert.equal(active.cost, oldProfiles.fixture[id][0].cost, "Rage cost is not lowered to force a win");
  for (const effect of active.effect) {
    assert.equal(effect.up_number, 0, "ordinary upgrade growth is not recovered from scripted rows");
    assert.equal(effect.duration_up, 0);
  }
  if (actors) {
    const source = actors.find(row => row.id === sourceIds[id as keyof typeof sourceIds])!;
    assert.ok(source);
    assert.equal(source.ref_id, id);
    assert.equal(source.res_id, `C${id}`);
    const selected = source.skill.find(row => row.type === 1)!;
    for (const field of ["target_rank", "cost", "cool_time", "crt_chance"] as const)
      assert.equal(active[field], selected[field], `${source.id}: original active metadata.${field}`);
    assert.equal(active.effect.length, selected.effect.length);
    for (let index = 0; index < selected.effect.length; index++)
      for (const field of tupleFields)
        assert.equal(active.effect[index][field], selected.effect[index][field], `${source.id}: complete effect${index}.${field}`);
  }
  const expected = structuredClone(fixtureSkillSlots(id));
  active.effect[0].base_number = 999999;
  active.effect[0].effect_desc.push("caller-only annotation");
  active.effect.splice(0, active.effect.length);
  assert.deepEqual(fixtureSkillSlots(id), expected, `${id}: nested active snapshots must not mutate source publication`);
}

const directory = mkdtempSync(path.join(tmpdir(), "blustone-episode-actives-"));
const filename = path.join(directory, "state.json");
try {
  const seeded = JSON.parse(inProfile("episode-followups", `
    const {ServerState}=await import('./src/state.ts');
    const state=new ServerState('http://localhost',${JSON.stringify(filename)});
    const guest=state.registerGuest({device_id:'episode-active-preservation'},{}).ret_data;
    const auth={otp:guest.otp}; const game=state.gameFor(state.accountFor(auth,{}));
    const target=game.starter_cards.find(card=>card.ref_id==='001');
    target.rank=2;target.exp=840;target.skill_1_level=7;target.skill_2_level=0;
    game.gold=11580;game.exp=840;
    state.setDeck({...auth,deck_info:[{type:1,list:[target.inst_id,0,0,0]}]},{});
    console.log(JSON.stringify({pvid:guest.pvid,id:target.inst_id}));
  `));
  const before = readFileSync(filename);
  const saved = JSON.parse(before.toString("utf8")) as { accounts: Array<{ pvid: number; otp: string }> };
  const { ServerState } = await import("../src/state.js");
  const state = new ServerState("http://localhost", filename);
  assert.deepEqual(readFileSync(filename), before, "new reference mode must not rewrite the progressed save");
  const seedAccount = saved.accounts.find(account => account.pvid === seeded.pvid)!;
  const game = state.gameFor(state.accountFor({ otp: seedAccount.otp }, {}));
  const target = game.starter_cards.find(card => card.inst_id === seeded.id)!;
  assert.equal(target.rank, 2);
  assert.equal(target.exp, 840);
  assert.equal(target.skill_1_level, 7, "trained levels remain owned progress even under local zero-growth active policy");
  assert.equal(target.skill_2_level, 0, "no follow-up level grant");
  assert.equal(game.gold, 11580);
  assert.equal(game.exp, 840);
  assert.deepEqual(readFileSync(filename), before, "reading inventory/reference mode does not retune or consume ownership");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("episode active vectors, legacy profiles, isolation and progressed-save preservation passed");
