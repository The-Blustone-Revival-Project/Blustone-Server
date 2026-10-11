/** Explicit reference input, not recovered equipment balance or owned grants. */
import {parseHunterEquipment} from "./hunter-equipment.js";
import {equipmentMaterialCoverage} from "./equipment-materials.js";
import {existsSync,readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {repositoryPath} from "./paths.js";
interface Card {base:{id:string;res_prefix:string;is_source?:number};equipment:unknown[]}
/** Supplies only known ordinary references and selected original sprite owners.
 * Parsing validates native fields/units; the original wire strings stay intact. */
export function applyEquipmentReferences<T extends Card>(cards: readonly T[], raw: unknown,
  selectedPackages: readonly string[]): T[] {
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) throw new TypeError("Equipment reference input requires a Hunter-keyed object");
  const input=raw as Record<string,unknown>;
  const replacements=new Map<string,unknown[]>();
  for(const id of Object.keys(input)) {
    const matches=cards.filter(card=>card.base.id===id);
    if(matches.length!==1 || matches[0].base.is_source!==0) throw new TypeError("Unknown or nonordinary equipment Hunter reference");
    const rows=input[id];
    const parsed=parseHunterEquipment(rows);
    const coverage=equipmentMaterialCoverage(matches[0].base.res_prefix,selectedPackages);
    for(const row of parsed) if(!coverage[row.slot].selectedOwner)
      throw new TypeError("Configured equipment requires selected original slot artwork");
    replacements.set(id,structuredClone(rows as unknown[]));
  }
  return cards.map(card=>replacements.has(card.base.id)?{...card,equipment:replacements.get(card.base.id)!}:card);
}

export function configuredEquipmentReferences<T extends Card>(cards: readonly T[]): T[] {
  const text=process.env.BLUSTONE_EQUIPMENT_REFERENCE_JSON;
  if(text===undefined) return [...cards];
  const input=JSON.parse(text),selected=(process.env.BLUSTONE_PACKAGE_NAMES??"").split(",");
  const result=applyEquipmentReferences(cards,input,selected);
  for(const id of Object.keys(input)) {
    if(!["pkgi1","pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE??""))
      throw new TypeError("Configured equipment requires deliverable PKGI1 original owners");
    const card=result.find(card=>card.base.id===id)!;
    const coverage=equipmentMaterialCoverage(card.base.res_prefix,selected);
    for(const row of parseHunterEquipment(input[id])) {
      const owner=coverage[row.slot].owners.find(owner=>owner.selected)!;
      const preferred=path.resolve(process.env.BLUSTONE_PACKAGE_DIR??repositoryPath("resources/runtime/packages"),owner.package);
      const fallback=process.env.BLUSTONE_RESOURCE_ASSET_DIR?path.resolve(process.env.BLUSTONE_RESOURCE_ASSET_DIR,owner.package):preferred;
      const file=existsSync(preferred)?preferred:fallback;
      if(!existsSync(file)||!statSync(file).isFile()) throw new TypeError("Missing configured equipment original owner");
      const bytes=readFileSync(file);
      if(bytes.length!==owner.bytes||createHash("sha256").update(bytes).digest("hex")!==owner.sha256)
        throw new TypeError("Configured equipment owner differs from pinned original bytes");
    }
  }
  return result;
}
