import assert from "node:assert/strict";
process.env.BLUSTONE_ACTIVE_SKILLS = "fixture";
const { fixtureSkillSlots } = await import("../src/skills.js");
for (const [id, cost] of [["001", 4], ["002", 3], ["003", 3], ["004", 4]] as const) {
  const rows = fixtureSkillSlots(id);
  assert.deepEqual(rows.map((row) => row.type), [1, 2, 3, 4, 5], "keep mandatory locked slots for card-info lookup");
  assert.equal(rows[0].cost, cost);
  assert.equal(rows[0].effect.length, 1);
  const effect = rows[0].effect[0];
  for (const key of ["serial", "effect_type", "target_type", "target_stat", "refer_target_stat", "refer_target_type",
    "base_number", "up_number", "duration", "duration_up", "interval"] as const) {
    assert.equal(typeof effect[key], "number");
  }
  assert.equal(typeof effect.value_calc, "string");
  assert.ok(Array.isArray(effect.effect_desc));
  const level1 = (effect.base_number + effect.up_number) / 100;
  const level2 = (effect.base_number + effect.up_number * 2) / 100;
  assert.ok(Math.abs(level1) > 0, "live scalar must not repeat formula-only zero-coefficient mistake");
  assert.ok(Math.abs(level2) > Math.abs(level1), "stored skill training must increase fixture magnitude");
  assert.equal(level1 > 0, id === "004", "positive heals; negative damages");
  if (id === "002") {
    assert.equal(effect.effect_type, 4, "DOT must expire through native Debuff removal path");
    assert.equal(effect.target_stat, 32);
    assert.equal(effect.duration / effect.interval + 1, 5, "immediate plus four timed applications");
  } else assert.equal(effect.target_stat, 1);
  assert.equal(effect.refer_target_stat, id === "004" ? 3 : 1, "healing uses DEF; damage uses current attack");
  assert.ok(rows.slice(1).every((row) => row.effect.length === 0), "unreconstructed follow-up/passive effects remain inert");
}
console.log("Skills: native slots/costs, scalar signs, owned-level scaling and finite DOT schema passed; runtime unverified.");
