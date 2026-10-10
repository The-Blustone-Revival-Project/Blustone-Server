import { repositoryPath } from "../src/paths.js";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function inProfile(mode: string, script: string) {
  const run = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: serverRoot, encoding: "utf8", env: { ...process.env, BLUSTONE_ACTIVE_SKILLS: mode },
  });
  assert.equal(run.status, 0, `${mode}: ${run.stderr}`);
  return run.stdout;
}

// Isolate module initialization so this suite cannot depend on a caller's mode.
process.env.BLUSTONE_ACTIVE_SKILLS = "episode-followups";
const { fixtureSkillSlots } = await import("../src/skills.js");
const ids = ["001", "002", "003", "004", "006", "CB0003_C001", "CB0001_M01"];
const fixture = JSON.parse(inProfile("fixture", `
  const {fixtureSkillSlots}=await import('./src/skills.ts');
  console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(ids)}.map(id=>[id,fixtureSkillSlots(id)]))));
`));
const neutral = JSON.parse(inProfile("neutral", `
  const {fixtureSkillSlots}=await import('./src/skills.ts');
  console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(ids)}.map(id=>[id,fixtureSkillSlots(id)]))));
`));

type OriginalActor = {
  id: string; ref_id: string; res_id: string;
  skill: Array<{ type: number; target_rank: number; effect: Array<Record<string, unknown>> }>;
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
  assert.deepEqual(slots.map(row => row.type), [1, 2, 3, 4, 5], `${id}: retain native map keys`);
  assert.deepEqual(slots.map(row => row.target_rank), [1, 2, 3, 4, 5], `${id}: retain locked rank gates`);
  assert.deepEqual(slots[0], fixture[id][0], `${id}: active effects/cost/growth/materials must remain unchanged`);
  assert.deepEqual(slots.slice(2), fixture[id].slice(2), `${id}: no accidental critical/passive publication`);
  if (!(id in sourceIds)) {
    assert.deepEqual(slots, fixture[id], `${id}: unsupported source and Mowgli must not receive another actor's follow-up`);
    if (!/^00[1-4]$/.test(id)) assert.deepEqual(slots, neutral[id], `${id}: catalogue IDs and scripted actor IDs are separate namespaces`);
  }
}

for (const [id, sourceId] of Object.entries(sourceIds)) {
  const published = fixtureSkillSlots(id)[1];
  assert.equal(published.target_rank, 2);
  assert.equal(published.cost, 0, "follow-up shares its active reservation, without a new Rage fee");
  assert.equal(published.effect.length, 1, "selected follow-ups remain nonempty without source files in portable checkouts");
  for (const adapted of published.effect) {
    assert.equal(adapted.up_number, 0, "no invented ordinary level growth");
    assert.equal(adapted.duration_up, 0);
    assert.notEqual(adapted.base_number, 0);
  }
  if (actors) {
    const source = actors.find(row => row.id === sourceId)!;
    assert.ok(source, `original selected actor ${sourceId} must exist`);
    assert.equal(source.ref_id, id);
    assert.equal(source.res_id, `C${id}`);
    const sourceSkill = source.skill.find(row => row.type === 2)!;
    assert.equal(published.target_rank, sourceSkill.target_rank);
    assert.equal(published.effect.length, sourceSkill.effect.length);
    for (let index = 0; index < sourceSkill.effect.length; index++) {
      for (const field of tupleFields) assert.equal(published.effect[index][field], sourceSkill.effect[index][field], `${sourceId} effect${index}.${field}`);
    }
  }
  // References can be serialized/cached/annotated by callers without corrupting
  // later publication from the profile's shared source constants.
  const expected = structuredClone(fixtureSkillSlots(id));
  published.effect[0].base_number = 999999;
  published.effect[0].effect_desc.push("caller-only annotation");
  published.effect.length = 0;
  assert.deepEqual(fixtureSkillSlots(id), expected, `${id}: returned nested objects must be isolated`);
}

const directory = mkdtempSync(path.join(tmpdir(), "blustone-episode-followups-"));
const filename = path.join(directory, "state.json");
try {
  // Save an already-progressed owned card in the old profile. Account data stays
  // within this disposable test file; only a pvid/instance ID is returned.
  const seeded = JSON.parse(inProfile("fixture", `
    const {ServerState}=await import('./src/state.ts');
    const state=new ServerState('http://localhost',${JSON.stringify(filename)});
    const guest=state.registerGuest({device_id:'followup-preservation'},{}).ret_data;
    const auth={otp:guest.otp}; const game=state.gameFor(state.accountFor(auth,{}));
    const target=game.starter_cards.find(card=>card.ref_id==='001');
    target.rank=2;target.exp=340;target.skill_1_level=3;target.skill_2_level=0;
    game.gold=11580;
    state.setDeck({...auth,deck_info:[{type:1,list:[target.inst_id,0,0,0]}]},{});
    console.log(JSON.stringify({pvid:guest.pvid,id:target.inst_id}));
  `));
  const before = readFileSync(filename);
  const { ServerState } = await import("../src/state.js");
  const state = new ServerState("http://localhost", filename);
  assert.deepEqual(readFileSync(filename), before, "switching reference profile must preserve the entire progressed save");
  const seedAccount = (JSON.parse(before.toString("utf8")) as { accounts: Array<{ pvid: number; otp: string }> }).accounts.find(entry => entry.pvid === seeded.pvid)!;
  assert.ok(seedAccount);
  const account = state.accountFor({ otp: seedAccount.otp }, {});
  const game = state.gameFor(account);
  const target = game.starter_cards.find(card => card.inst_id === seeded.id)!;
  assert.equal(target.skill_1_level, 3);
  assert.equal(target.skill_2_level, 0, "publication must not grant a follow-up level");
  assert.equal(target.rank, 2);
  assert.equal(target.exp, 340);
  const beforeCards = structuredClone([...game.starter_cards, ...game.recruited_cards]);
  const beforeDecks = structuredClone(game.decks);
  const auth = { otp: account.otp };
  const result = state.trainSkills({ ...auth, target_inst_id: target.inst_id, mulit_skill_up_count: [0, 1, 0, 0, 0] }, {});
  assert.equal(result.result_code, 1, "eligible owned zero-level follow-up must retain the existing native training path");
  assert.equal(target.skill_2_level, 1);
  assert.equal(game.gold, 11480, "destination level1 retains the existing100-gold policy");
  const expectedCards = structuredClone(beforeCards);
  expectedCards.find(card => card.inst_id === target.inst_id)!.skill_2_level = 1;
  assert.deepEqual([...game.starter_cards, ...game.recruited_cards], expectedCards, "training changes only the selected owned level");
  assert.deepEqual(game.decks, beforeDecks);
  assert.deepEqual(fixtureSkillSlots("001")[0], fixture["001"][0], "training must not retune active publication");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("episode follow-up source selection, isolation and progressed-save preservation passed");
