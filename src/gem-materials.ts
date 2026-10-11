import type { GemReference } from "./gem-instances.js";

/** Source-positive artwork admission, separate from Gem INFO/gameplay IDs.
 * Caller supplies the pinned original catalogue and delivery selection. */
export function gemArtworkOwner(reference: GemReference, packs: readonly {
  package: string; records: readonly { name: string }[];
}[], selectedPackages?: ReadonlySet<string>): string {
  if (!/^G_[123]_\d{3}_R[1-5]$/.test(reference.res_id)) throw new TypeError("Gem resource is outside source-positive ranked artwork namespaces");
  const owners = packs.filter(pack => pack.records.some(record => record.name === reference.res_id));
  if (owners.length !== 1) throw new TypeError("Gem resource has missing/ambiguous original owner");
  if (selectedPackages && !selectedPackages.has(owners[0].package)) throw new TypeError("Gem original owner package is not selected");
  return owners[0].package;
}
