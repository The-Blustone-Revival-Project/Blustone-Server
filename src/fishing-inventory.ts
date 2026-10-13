import {fishingInventoryReplacement,type FishingInventoryReplacement} from "./fishing-reference.js";

/** Explicit owned snapshot, separate from GetItem metadata and pool membership.
 * Counts never derive from references, price rows, sprite IDs or tutorial input.
 * Nonnegative widths/unique rows/lossless strings are supported replica policy.
 * An optional known-ID set binds reads to independently supplied fish metadata. */
export function ownedFishingInventory(raw: unknown, knownFishIds?: ReadonlySet<string>): FishingInventoryReplacement[] {
  if(!Array.isArray(raw)) throw new TypeError("Owned fishing inventory requires an array");
  const seen=new Set<string>();
  return raw.map(value=>{
    if(!value || typeof value!=="object" || Array.isArray(value)) throw new TypeError("Expected owned fish object");
    const row=value as Record<string,unknown>,id=row.fish_id;
    if(Object.keys(row).some(key=>!["fish_id","b_cnt","s_cnt","g_cnt"].includes(key)))
      throw new TypeError("Unsupported owned fish fields; refusing to discard imported data");
    if(typeof id!=="string" || !id || Buffer.from(id,"utf8").toString("utf8")!==id)
      throw new TypeError("Owned fish requires lossless string identity");
    if(seen.has(id)) throw new TypeError("Duplicate owned fish identity");
    if(knownFishIds && !knownFishIds.has(id)) throw new TypeError("Owned fish has no separately supplied fishing item definition");
    seen.add(id);
    return fishingInventoryReplacement(id,{b_cnt:row.b_cnt as number,s_cnt:row.s_cnt as number,g_cnt:row.g_cnt as number});
  });
}
