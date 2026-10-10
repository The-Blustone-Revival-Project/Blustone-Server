import { starterReference, starterStages } from "./bootstrap.js";
import { SEARCH_STAGE_ID } from "./search-stage.js";

/** FindShard entry schemas are native-derived. Original search IDs, limits,
 * costs, periods and rewards are missing; this is an idle local entry fixture.
 * No search job, ticket, hunter, shard or completion is created by these reads. */
export function hunterSearchReference() {
  const card = starterReference.find((row) => row.base.id === "006");
  const stage = starterStages.stage.find((row) => row.id === "n_01_07") ?? starterStages.stage[0];
  if (!card || !stage) throw new Error("Hunter search entry requires a published card and stage");
  // SetCardOnPos names the rendered cell from INFO.id. SetTutorialFind's
  // callback searches child "017" and dereferences it without a null guard.
  // This is a recovered search/UI identity, not proof that card006 is Lapis.
  return { ref: [{ type: 1, serial: 1, id: "017",
    target_card_id: card.base.id, target_stage_id: SEARCH_STAGE_ID,
    max_join_cnt: 1, max_play_cnt: 1, max_retry_cnt: 1, period: 3600, cost: 1 }], event_ref: [] };
}

export function hunterSearchInstances() {
  return { inst: [], play_log: [], retry_log: [],
    // LOCAL flat Manda fees, original tiers/prices missing.
    reset_price: { price: 30, price_type: 1 }, retry_price: { price: 10, price_type: 1 },
    reset_cnt: 0, cooltime: 0, cleared_explore: [],
    // SyncUser's null-tag branch returns before writing player data. An empty
    // object is unnecessary; no fabricated wallet/energy update belongs here.
    user: null };
}
