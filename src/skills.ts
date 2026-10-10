/** Reconstructed effects with selected original Episode active/type2 tuples.
 * Final ordinary magnitudes/growth and cinematic/icon bindings are missing.
 * Opt-in native validation, not production balance.
 * Evidence: starter-skill-combat-mechanics.md; active-skill-gesture-rage.md. */
const activeMode = process.env.BLUSTONE_ACTIVE_SKILLS ?? "neutral";
if (!["neutral", "fixture", "episode-followups", "episode-actives", "episode-complete"].includes(activeMode)) throw new Error("Unknown active skill profile");
export const ACTIVE_SKILL_MODE = activeMode;

interface ActiveDefinition { cost: number; name: string; desc: string; heal?: boolean; bleed?: boolean }
const definitions: Record<string, ActiveDefinition> = {
  "001": { cost: 4, name: "Bombardment", desc: "Damages the frontline enemy." },
  "002": { cost: 3, name: "Bleeding attack", desc: "Deals bleeding damage to the frontline enemy over four seconds.", bleed: true },
  "003": { cost: 3, name: "Frontline strike", desc: "Damages the frontline enemy." },
  "004": { cost: 4, name: "Healing support", desc: "Heals the frontline teammate. Recovery increases with defense.", heal: true },
};

// Exact type2 effect tuples from original R_EPISODE STAT rows. Selecting these
// encounter variants for ordinary hunters, serial1 and zero growth are LOCAL
// policy; final ordinary reference values and growth remain unrecovered.
// Evidence: starter-original-skill-coverage.md; skill-followup-construction-contract.md.
const episodeFollowups: Record<string, { source: string; effect: ReturnType<typeof followupEffect> }> = {
  "001": { source: "STAT[49] CB0003_C001", effect: followupEffect(4, 1, 4, 2, 0, -30, 4000) },
  "003": { source: "STAT[47] CB0003_C003", effect: followupEffect(4, 1, 15, 2, 0, 1, 1500) },
  "004": { source: "STAT[18] EVCB0201_004", effect: followupEffect(3, 4, 6, 2, 0, 20, 4000) },
};

// Intact type1 metadata/effect vectors from those same selected Episode rows.
// These values enter the native reference/defense calculation, not flat HP
// subtraction. Serial assignment, zero growth and ordinary adoption are local
// policy; source rows do not recover final ordinary training/balance data.
const episodeActives: Record<string, { source: string; cost: number; coolTime: number;
  criticalChance: number; effects: ReturnType<typeof followupEffect>[] }> = {
  "001": { source: "STAT[49] CB0003_C001", cost: 4, coolTime: 5000, criticalChance: 100,
    effects: [followupEffect(1, 1, 1, 1, 1, -2000, 0), followupEffect(4, 1, 16, 2, 0, -3, 200)] },
  "003": { source: "STAT[47] CB0003_C003", cost: 3, coolTime: 5000, criticalChance: 100,
    effects: [followupEffect(1, 1, 1, 1, 1, -2000, 0)] },
  "004": { source: "STAT[18] EVCB0201_004", cost: 4, coolTime: 5000, criticalChance: 50,
    effects: [followupEffect(1, 4, 1, 1, 3, 150, 0)] },
};

// Remaining intact slots from the SAME selected rows. Missing source slots stay
// empty. These are encounter-derived ordinary adoption policy, not final balance.
const episodeAdditional: Record<string, Partial<Record<number, ReturnType<typeof followupEffect>[]>>> = {
  "001": {
    3: [followupEffect(2, 3, 14, 2, 0, 10, 300)],
    4: [followupEffect(1, 1, 1, 1, 1, -1000, 0), followupEffect(4, 1, 16, 2, 0, -3, 200)],
    5: [followupEffect(2, 3, 6, 2, 0, 15, 300)],
  },
  "003": { 4: [followupEffect(1, 2, 1, 1, 6, 100, 3100, 1000)] },
  "004": {
    4: [followupEffect(5, 4, 19, 2, 0, 10, 4000), followupEffect(1, 4, 1, 1, 3, 20, 0)],
    5: [followupEffect(2, 3, 13, 2, 0, 100, 300)],
  },
};

function followupEffect(effectType: number, targetType: number, targetStat: number,
  referType: number, referStat: number, base: number, duration: number, interval = 0) {
  return {
    serial: 1, effect_type: effectType, target_type: targetType, target_stat: targetStat,
    refer_target_type: referType, refer_target_stat: referStat, base_number: base,
    up_number: 0, duration, duration_up: 0, interval, value_calc: "", effect_desc: [] as string[],
  };
}

function activeEffect(definition: ActiveDefinition) {
  const heal = Boolean(definition.heal), bleed = Boolean(definition.bleed);
  return {
    serial: 1, effect_type: bleed ? 4 : 1, target_type: heal ? 4 : 1,
    target_stat: bleed ? 32 : 1, refer_target_stat: heal ? 3 : 1, refer_target_type: 1,
    // Native coefficient=(base+up*OWNED skill level)/100. Local level1:
    // direct100% attack, bleed20% per tick (five nominal applications), heal100% DEF.
    base_number: heal ? 95 : bleed ? -19 : -95, up_number: heal ? 5 : bleed ? -1 : -5,
    duration: bleed ? 4000 : 0, duration_up: 0, interval: bleed ? 1000 : 0,
    value_calc: heal ? "stat*(value+value_up*skill_level)/100"
      : bleed ? "(-1*(stat*(8+2*rank))*(value+value_up*skill_level)/10000)*5"
      : "-1*(stat*(8+2*rank))*(value+value_up*skill_level)/10000",
    effect_desc: [],
  };
}

/** Card panel indexes ALL five type slots even while locked. Retain them;
 * Episode-derived slots are opt-in; absent source slots remain empty.
 * Native rank admission and level arithmetic apply; no owned level/grant edit. */
export function fixtureSkillSlots(refId: string) {
  const active = ACTIVE_SKILL_MODE !== "neutral" ? definitions[refId] : undefined;
  const followup = ["episode-followups", "episode-actives", "episode-complete"].includes(ACTIVE_SKILL_MODE) ? episodeFollowups[refId] : undefined;
  const original = ["episode-actives", "episode-complete"].includes(ACTIVE_SKILL_MODE) ? episodeActives[refId] : undefined;
  const additional = ACTIVE_SKILL_MODE === "episode-complete" ? episodeAdditional[refId] : undefined;
  return Array.from({ length: 5 }, (_, index) => ({
    target_rank: index + 1, type: index + 1,
    name: index === 0 && active ? active.name : `Skill ${index + 1}`,
    desc: index === 0 && active ? active.desc : "",
    // Genuine AT animations in each recovered Q pack (not SI01 S2 sprites).
    // Slot assignment is reconstructed; original response bindings are absent.
    cut_in_id: "", icon_id: active ? `C${refId}_SI${index + 1}` : "",
    cool_time: index === 0 && original ? original.coolTime : 0,
    cost: index === 0 ? original?.cost ?? active?.cost ?? 0 : 0,
    crt_chance: index === 0 && original ? original.criticalChance : 0,
    effect: index === 0 && original ? original.effects.map((effect, offset) => ({
      ...effect, serial: offset + 1, effect_desc: [...effect.effect_desc],
    })) : index === 0 && active ? [activeEffect(active)]
      : index === 1 && followup ? [{ ...followup.effect, effect_desc: [...followup.effect.effect_desc] }]
      : (additional?.[index + 1] ?? []).map((effect, offset) => ({ ...effect, serial: offset + 1, effect_desc: [...effect.effect_desc] })),
  }));
}
