/** Pinned original sprites only. No stat, price, rank or reference-ID inference. */
import {readFileSync} from "node:fs";
import {repositoryPath} from "./paths.js";
interface EquipmentSprite {
  name: string; prefix: string; slot: number; headerOffset: number;
  rawBytes: number; packedBytes: number; payloadSha256: string;
}
interface EquipmentPack {package: string; destination: string; source: string; bytes: number; sha256: string; recordCount: number; records: EquipmentSprite[]}
const metadata = JSON.parse(readFileSync(repositoryPath("resources/reference/hunter-equipment-materials.json"), "utf8")) as {packs: EquipmentPack[]};
/** Caller supplies the actual native ordinary/awakened draw prefix. Selection
 * reports declared package names, not delivery or live sprite registration. */
export function equipmentMaterialCoverage(prefix: string, selectedPackages: readonly string[] = []) {
  const selected = new Set(selectedPackages);
  return ["_WEP", "_AMOR", "_ACCRY"].map((suffix, slot) => {
    const name = prefix + suffix;
    const owners = metadata.packs.filter(pack => pack.records.some(record => record.name === name && record.slot === slot))
      .map(pack => ({package:pack.package,source:pack.source,sha256:pack.sha256,bytes:pack.bytes,
        selected:selected.has(pack.package),record:structuredClone(pack.records.find(record=>record.name===name && record.slot===slot)!)}));
    return {slot,name,owners,originalSpriteKnown:owners.length>0,selectedOwner:owners.some(owner=>owner.selected),
      nativeRenderingVerified:false,originalStats:"UNKNOWN",originalReferenceId:"UNKNOWN"};
  });
}
