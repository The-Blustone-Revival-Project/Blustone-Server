/** Original CSRAchieve contracts, separate from daily expedition references.
 * No production quest catalogue, condition implementation or reward settlement
 * is recovered here. Ingestion requires explicitly source-approved identities.
 */
export const QUEST_NATIVE_EVIDENCE = {
  originalLibrarySha256: "c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec",
  reference: { function: "CSRAchieve::ParseReference", elf: "83391c", route: "/dailyquest/GetRefList", collection: "ret_data" },
  lobby: { function: "CSRAchieve::ParseLobbyEnter", elf: "834918", fields: ["dailyquest_min_stage", "daily_quest", "linear_quest"] },
  dailyInstance: { function: "CSRAchieve::ParseDailyQuest2", elf: "834d14", fields: ["daily_quest_id", "is_rewarded", "cur_val"] },
  linearInstance: { function: "CSRAchieve::ParseLinearQuest2", elf: "834fd4", nativeType: 3 },
  rewardRequest: { function: "CSRAchieve::RequestReward2", elf: "835ca0",
    dailyPathLiteral: "dailyquest/RequestReward", dailyFields: ["daily_quest_id", "target_val"],
    linearPathLiteral: "linearquest/Reward", linearFields: ["serial", "id", "target_val"] },
  nativeSummaryIdentity: "TODAY_QUEST",
  dailyExpeditionReference: { function: "CSRRefData::SetDailyQuest", elf: "dd2ec0", collection: "ret_data.list",
    fields: ["id", "area_id", "valid_day", "try_cnt", "reset_cnt", "res_id", "reward_id_1", "reward_id_2", "reward_id_3", "reset_price"] },
} as const;

export const QUEST_CURRENCY_FIELDS = ["vip_exp", "ap", "bp", "gold", "honor", "exp", "free_iap", "iap"] as const;
type CurrencyField = typeof QUEST_CURRENCY_FIELDS[number];
export interface QuestRewardIdentity { ref_id: string; qty: number }
export type QuestReward = Record<CurrencyField, number> & {
  item_list: QuestRewardIdentity[]; card_list: QuestRewardIdentity[];
};
export interface QuestReference {
  type: number; title: string; desc: string; desc_noti: string; id: string;
  npc_id: string; go_to: string; serial: number; target_val: number; option_val: number;
  reward: QuestReward;
}
// QuestReference.reward is the normalized INTERNAL preview object. Original
// GetRefList/linear wire rows encode it as JSON STRING; claim reward is an
// independent OBJECT. See quest-reward-string-wire-correction-2026-10-16.md.
export interface DailyQuestInstance { daily_quest_id: string; is_rewarded: number; cur_val: number }

function object(raw: unknown, field: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError(`Malformed ${field}`);
  return raw as Record<string, unknown>;
}
function text(raw: unknown, field: string, nonempty = false): string {
  if (typeof raw !== "string" || (nonempty && !raw.length)) throw new TypeError(`Malformed ${field}`);
  return raw;
}
function uint32(raw: unknown, field: string): number {
  // Strict ingestion policy; native numeric conversion itself accepts several
  // JSON variants. Refuse malformed source rather than silently default to0.
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 0xffffffff)
    throw new TypeError(`Malformed ${field}`);
  return raw;
}

/** Preserve symbolic IDs/quantities. This does not resolve RP1/FMD1 etc into
 * wallet fields, item stacks or Hunter grants; those are separate contracts.
 * Achievement CreateAchievementElement uses id/qty instead of ref_id/qty and
 * must not share this parser implicitly. */
export function questRewardIdentity(raw: unknown): QuestReward {
  const reward = object(raw, "quest reward");
  const currency = Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key => [key, uint32(reward[key], key)])) as Record<CurrencyField, number>;
  const list = (key: "item_list" | "card_list") => {
    if (!Array.isArray(reward[key])) throw new TypeError(`Malformed ${key}`);
    return (reward[key] as unknown[]).map(entry => {
      const row = object(entry, key);
      return { ref_id: text(row.ref_id, `${key}.ref_id`, true), qty: uint32(row.qty, `${key}.qty`) };
    });
  };
  return { ...currency, item_list: list("item_list"), card_list: list("card_list") };
}

/** Input is normalized reference data with an already-decoded reward object,
 * not a direct copy of the native string-encoded preview field.
 * Array collection is strict local ingestion policy: native iterators also
 * handle object collections, but do not index a list child in this consumer.
 * No IDs are manufactured from source filenames, stage IDs or a client's
 * request. approvedOriginalIds must come from an independently recovered
 * reference source; validating a schema does not authenticate that source. */
export function ingestQuestReferences(raw: unknown, approvedOriginalIds: ReadonlySet<string>): QuestReference[] {
  if (!Array.isArray(raw)) throw new TypeError("Quest reference ret_data must be a bare array");
  const seen = new Set<string>();
  return raw.map(entry => {
    const row = object(entry, "quest reference");
    const id = text(row.id, "quest id", true);
    if (!approvedOriginalIds.has(id) || seen.has(id)) throw new Error("Unknown or duplicate source quest identity");
    seen.add(id);
    return {
      type: uint32(row.type, "type"), title: text(row.title, "title"), desc: text(row.desc, "desc"),
      desc_noti: text(row.desc_noti, "desc_noti"), id, npc_id: text(row.npc_id, "npc_id"),
      go_to: text(row.go_to, "go_to"), serial: uint32(row.serial, "serial"),
      target_val: uint32(row.target_val, "target_val"), option_val: uint32(row.option_val, "option_val"),
      reward: questRewardIdentity(row.reward),
    };
  });
}

/** Current-value/rewarded state can only update a previously approved reference.
 * No synthetic quest, inferred completion or reward receipt is produced. */
export function ingestDailyQuestInstances(raw: unknown, references: readonly QuestReference[]): DailyQuestInstance[] {
  if (!Array.isArray(raw)) throw new TypeError("Daily quest instances must be a bare array");
  const approved = new Set(references.map(row => row.id));
  const seen = new Set<string>();
  return raw.map(entry => {
    const row = object(entry, "daily quest instance");
    const daily_quest_id = text(row.daily_quest_id, "daily_quest_id", true);
    if (!approved.has(daily_quest_id) || seen.has(daily_quest_id)) throw new Error("Unknown or duplicate daily quest instance");
    seen.add(daily_quest_id);
    const is_rewarded = uint32(row.is_rewarded, "is_rewarded");
    if (is_rewarded > 1) throw new TypeError("Malformed is_rewarded flag");
    return { daily_quest_id, is_rewarded, cur_val: uint32(row.cur_val, "cur_val") };
  });
}

/** Demonstrates the recovered request-key boundary, not authorization or claim
 * eligibility. A future state handler must use authoritative earned state and
 * original condition semantics, persist once, and refuse replayed settlements. */
export function questRewardRequestKeys(reference: QuestReference) {
  return reference.type === QUEST_NATIVE_EVIDENCE.linearInstance.nativeType
    ? { pathLiteral: QUEST_NATIVE_EVIDENCE.rewardRequest.linearPathLiteral,
      payload: { serial: reference.serial, id: reference.id, target_val: reference.target_val } }
    : { pathLiteral: QUEST_NATIVE_EVIDENCE.rewardRequest.dailyPathLiteral,
      payload: { daily_quest_id: reference.id, target_val: reference.target_val } };
}
