import { cardInstance, starterReference } from "./bootstrap.js";
/** Nonowned NPC serial, separate from this replica's owned-card allocator.
 * A zero template is mutated to maxOwned+1 by native MakeStageInst; a warm
 * next match reuses that ID and collides with its first generated enemy. */
export const SEARCH_HELPER_SERIAL = 900_000_001;

/** SetAbyss reads ret_data.virtual_friend, then parses EACH FLAT ROW as a
 * CSRCard before overriding card_ref_id/card_exp. These are nonowned reference
 * templates. Original helper roster/levels are unknown; known-art001 is local. */
export function searchHelperReference() {
  if (!starterReference.some((row) => row.base.id === "001")) throw new Error("Search helper requires known card001");
  return { list: [], reset_price: [], virtual_friend: [{
    ...cardInstance(SEARCH_HELPER_SERIAL, "001", 1),
    id: "local_lantern_helper", nick_name: "Lantern", user_exp: 0,
    card_ref_id: "001", card_exp: 0,
  }] };
}

/** ReqSupportersCB marks these IDs USED; they are not available profiles.
 * Stateful used IDs come from usedSearchHelpers after an accepted Begin. */
export function searchUsedHelpers() { return { friend: [], virtual: [] }; }
