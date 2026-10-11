/** Original Arena reward/display identity: FCResult.SetData G c21274 uses FC1;
 * BT_MY_CHIP opens ItemDetail(FC1), and original BT_LOBBY binds its sprite to
 * IT_BT_S. The same original UI_ITEM family contains the 150x150 RGBA8 IT_BT.
 * Choosing that full-size member for the item thumbnail is LOCAL display
 * policy, not recovery of FC1's original GetItem row. All other metadata below
 * is an inert local display reference. No inventory, sale, purchase, currency
 * credit or reward replay is implemented or implied by this reference.
 */
export const ARENA_HONOR_ID = "FC1";
export const ARENA_HONOR_COUNTER_RESOURCE = "IT_BT_S";
export const ARENA_HONOR_DISPLAY_REFERENCE = Object.freeze({
  id: ARENA_HONOR_ID,
  name: "Fight Chips",
  desc: "Currency earned in Fight Club.",
  thumbnail_id: "IT_BT",
  rank: 1,
  use_type: 0,
  effect: "",
  sell_price: 0,
  collect_qty: 0,
});
