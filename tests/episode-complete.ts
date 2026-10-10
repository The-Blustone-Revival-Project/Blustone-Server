import { repositoryPath } from "../src/paths.js";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["001", "002", "003", "004", "006", "CB0003_C001", "CB0001_M01"];
const legacy = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
  `const {fixtureSkillSlots}=await import('./src/skills.ts'); console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(ids)}.map(id=>[id,fixtureSkillSlots(id)]))));`],
  { cwd: root, encoding: "utf8", env: { ...process.env, BLUSTONE_ACTIVE_SKILLS: "episode-actives" } });
assert.equal(legacy.status, 0, legacy.stderr);
const previous = JSON.parse(legacy.stdout);
process.env.BLUSTONE_ACTIVE_SKILLS = "episode-complete";
const { fixtureSkillSlots } = await import("../src/skills.js");
const sources: Record<string, string> = { "001": "CB0003_C001", "003": "CB0003_C003", "004": "EVCB0201_004" };
const lengths: Record<string, number[]> = { "001": [2, 1, 1, 2, 1], "003": [1, 1, 0, 1, 0], "004": [1, 1, 0, 2, 1] };
const file = repositoryPath("resources", "reference", "episodes", "EPISODE_STAT_ACTORS.json");
let original: any[] | undefined;
if (existsSync(file)) {
  const bytes = readFileSync(file);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56");
  original = JSON.parse(bytes.toString("utf8"));
}
for (const id of ids) {
  const slots = fixtureSkillSlots(id);
  assert.deepEqual(slots.slice(0, 2), previous[id].slice(0, 2), "complete mode retains active/follow-up metadata and vectors");
  assert.deepEqual(slots.map(row => row.target_rank), [1, 2, 3, 4, 5]);
  if (!sources[id]) { assert.deepEqual(slots, previous[id], "no fabricated Mowgli or wrong-namespace source join"); continue; }
  assert.deepEqual(slots.map(row => row.effect.length), lengths[id], "absent original slots stay empty");
  const source = original?.find(row => row.id === sources[id]);
  if (original) {
    assert.equal(source.ref_id, id);
    assert.equal(source.res_id, `C${id}`);
    for (const slot of slots) {
      const selected = source.skill.find((row: any) => row.type === slot.type);
      assert.equal(slot.effect.length, selected?.effect.length ?? 0);
      if (!selected) continue;
      assert.equal(slot.target_rank, selected.target_rank);
      for (const field of ["cost", "cool_time", "crt_chance"] as const) assert.equal(slot[field], selected[field] ?? 0);
      for (let index = 0; index < slot.effect.length; index++) {
        for (const field of ["effect_type", "target_type", "target_stat", "refer_target_type", "refer_target_stat", "base_number", "duration", "interval"] as const)
          assert.equal(slot.effect[index][field], selected.effect[index][field], `${source.id} type${slot.type} effect${index} ${field}`);
      }
    }
  }
  const snapshot = structuredClone(slots);
  for (const slot of slots) for (const effect of slot.effect) {
    assert.equal(effect.up_number, 0);
    assert.equal(effect.duration_up, 0);
    effect.base_number = 123456; effect.effect_desc.push("caller-only");
  }
  assert.deepEqual(fixtureSkillSlots(id), snapshot, "additional nested effects cannot mutate later publication");
}
assert.equal(fixtureSkillSlots("003")[3].effect[0].interval, 1000, "Nene periodic additional result retains its tick interval");
const directory = mkdtempSync(path.join(tmpdir(), "blustone-complete-preservation-"));
const stateFile = path.join(directory, "state.json");
try {
  const seed = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const {ServerState}=await import('./src/state.ts');
    const state=new ServerState('http://localhost',${JSON.stringify(stateFile)});
    const guest=state.registerGuest({device_id:'complete-skill-preservation'},{}).ret_data;
    const game=state.gameFor(state.accountFor({otp:guest.otp},{}));
    const hunter=game.starter_cards.find(card=>card.ref_id==='001');
    hunter.rank=5;hunter.skill_3_level=0;hunter.skill_4_level=7;hunter.skill_5_level=0;
    game.gold=11680;state.setDeck({otp:guest.otp,deck_info:[{type:1,list:[hunter.inst_id,0,0,0]}]},{});
  `], { cwd: root, encoding: "utf8", env: { ...process.env, BLUSTONE_ACTIVE_SKILLS: "episode-actives" } });
  assert.equal(seed.status, 0, seed.stderr);
  const before = readFileSync(stateFile);
  const saved = JSON.parse(before.toString("utf8"));
  const { ServerState } = await import("../src/state.js");
  const state = new ServerState("http://localhost", stateFile);
  const game = state.gameFor(state.accountFor({ otp: saved.accounts[0].otp }, {}));
  const hunter = game.starter_cards.find(card => card.ref_id === "001")!;
  assert.deepEqual([hunter.rank, hunter.skill_3_level, hunter.skill_4_level, hunter.skill_5_level], [5, 0, 7, 0]);
  assert.equal(game.gold, 11680);
  fixtureSkillSlots("001");
  assert.deepEqual(readFileSync(stateFile), before, "complete profile leaves progressed ownership, zero levels, decks and economy unchanged");
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log(`episode complete skill vectors, source coverage, rank metadata, isolation and saved progress passed; original oracle=${Boolean(original)}`);
