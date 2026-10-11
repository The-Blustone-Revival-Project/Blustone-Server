import { CARD_REFERENCE_PROFILE, starterReference, starterStages } from "./bootstrap.js";
import { fuelItemReference } from "./shop-fuel.js";
import { SEARCH_CAPSULE_ID, searchCapsuleReference } from "./search-capsules.js";
import { ARENA_HONOR_DISPLAY_REFERENCE } from "./arena-honor-reference.js";

/** Native use_type3 binds item.effect (hunter ID) to CardInfo's trace item ID.
 * Original item IDs, thresholds and drop tables are missing. These are local
 * reference/navigation fixtures, never inventory grants or original drops. */
export const HUNTER_TRACE_ITEMS = [
  { id: "local_gerard_trace", cardId: "005", rank: 2, name: "Gerard Traces", collect_qty: 20 },
  { id: "local_sylvester_trace", cardId: "006", rank: 1, name: "Sylvester Traces", collect_qty: 10 },
] as const;
export const HUNTER_TRACE_STAGE = "n_01_07";

/** Library SetRole filters CardInfo.collect_qty before building its row vector.
 * An empty role vector is dereferenced at original ELF8630b4. Item PostProcess
 * supplies collect_qty through use_type3/effect=exact Hunter reference ID.
 * Original trace item IDs and thresholds are unknown; positive1 is exclusively
 * local navigation policy, not an earned item or a recovered exchange price.
 * Keep these out of HUNTER_TRACE_ITEMS: that list owns Search/claim semantics.
 * No acquisition link, inventory stack, drop or exchange handler is added. */
export function libraryNavigationTraceItems() {
  if (CARD_REFERENCE_PROFILE !== "materials") return [];
  const priorBindings = new Set<string>(HUNTER_TRACE_ITEMS.map((row) => row.cardId));
  return starterReference.filter((card) => !priorBindings.has(card.base.id)).map((card) => ({
    id: `local_library_trace_${card.base.id}`, name: `${card.base.name} Traces`,
    rank: Math.min(...card.stat.map((row) => row.rank)),
    use_type: 3, effect: card.base.id, collect_qty: 1,
    thumbnail_id: "", sell_price: 0,
    desc: "Original trace acquisition and exchange remain unreconstructed.",
  }));
}

/** Native gold display identity; metadata is a local preview fixture.
 * No inventory stack, redemption, sale or currency grant is implied. Without
 * this row IsItemData(RP1) is false and the calendar can route gold to InitCard. */
export const GOLD_DISPLAY_REFERENCE = {
  id: "RP1", name: "Rupees", desc: "Currency used in Midgard.",
  // Original common UI binds ICON_GOLD to IT_CO; RP1's original row is unknown.
  thumbnail_id: "IT_CO", rank: 1, use_type: 0, effect: "", sell_price: 0, collect_qty: 0,
};

/** Original reward display identity (GetItemThumbList Gafa5d2), not an item
 * stack. Metadata/neutral behavior and the footer-glyph thumbnail assignment
 * are local display policy: the original VIP1 reference row is unrecovered.
 * Original ICON_VE is already served in UI_SHOP; no generated art or alias. */
export const VETERAN_EXP_DISPLAY_REFERENCE = Object.freeze({
  id: "VIP1", name: "Veteran EXP", desc: "Experience used to raise your Veteran level.",
  thumbnail_id: "ICON_VE", rank: 1, use_type: 0, effect: "", sell_price: 0, collect_qty: 0,
});

export function itemReference() {
  const fuel = fuelItemReference();
  const available = HUNTER_TRACE_ITEMS.filter((item) => starterReference.some((card) => card.base.id === item.cardId));
  return { ...fuel, item: [...fuel.item, searchCapsuleReference, GOLD_DISPLAY_REFERENCE, { ...VETERAN_EXP_DISPLAY_REFERENCE }, { ...ARENA_HONOR_DISPLAY_REFERENCE }, ...available.map(({ cardId, ...item }) => ({ ...item,
    use_type: 3, sell_price: 0, thumbnail_id: "", effect: cardId,
    desc: cardId === "006" ? "Collect Sylvester traces in Hunter Search to recruit a hunter." :
      "Gerard traces. Acquisition is not available yet." })), ...libraryNavigationTraceItems()],
    // IsActivatedTrace(type3) requires actual stars on THIS source_id. No
    // uncleared-stage alias or synthetic unlock; normal UI can navigate its map.
    trace: starterStages.stage.some((stage) => stage.id === HUNTER_TRACE_STAGE) ? [...available.map((item) => ({
      item_id: item.id, order: 1, type: 3, source_id: HUNTER_TRACE_STAGE, thumb_id: "",
    })),
    // Native capsule+ opens ItemDetail(AIRSHIP_TICKET), not a shop. This
    // acquisition link names a stage whose actual victory earned a capsule.
    { item_id: SEARCH_CAPSULE_ID, order: 1, type: 3, source_id: HUNTER_TRACE_STAGE, thumb_id: "" }] : [] };
}
