/** Exact actor namespaces from original JET record names, not pack basenames.
 * Does not recover monster stats, difficulty, placements or owned progress. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { repositoryPath } from "./paths.js";

interface Pack { package: string; bytes: number; sha256: string; source: string; recordCount: number; namespaces: Record<string, string[]> }
export const MONSTER_ART_PACKS = (JSON.parse(readFileSync(repositoryPath("resources/reference/monster-art-namespaces.json"), "utf8")) as {packs: Pack[]}).packs;
export const MONSTER_ART_OWNER = Object.freeze(Object.fromEntries(MONSTER_ART_PACKS.flatMap(pack => Object.keys(pack.namespaces).map(id => [id, pack.package]))));
export const RECOVERED_MONSTER_NAMESPACES: readonly string[] = Object.freeze(Object.keys(MONSTER_ART_OWNER).sort());

export function requireSelectedMonsterArt(id: string, env: NodeJS.ProcessEnv = process.env): string {
  const owner = MONSTER_ART_OWNER[id];
  if (!Object.hasOwn(MONSTER_ART_OWNER, id)) throw new Error(`Unknown recovered monster actor namespace: ${id}`);
  const names = (env.BLUSTONE_PACKAGE_NAMES ?? "E_NEW.jet,E_MIDAGE.jet").split(",").map(name => name.trim());
  const packageDir = path.resolve(env.BLUSTONE_PACKAGE_DIR ?? repositoryPath("resources/runtime/packages"));
  const assetDir = env.BLUSTONE_RESOURCE_ASSET_DIR ? path.resolve(env.BLUSTONE_RESOURCE_ASSET_DIR) : undefined;
  let file: string | undefined;
  if (names.includes(owner) && ["pkgi1", "pkgi1-tree"].includes(env.BLUSTONE_PACKAGE_MODE ?? "")) {
    const preferred = path.join(packageDir, owner);
    file = existsSync(preferred) ? preferred : assetDir ? path.join(assetDir, owner) : preferred;
  } else if (names.includes("E_NEW.jet") && env.BLUSTONE_PACKAGE_MODE === "pkgi1-tree" && assetDir) {
    const tree = env.BLUSTONE_PACKAGE_TREE_DIR ? path.resolve(env.BLUSTONE_PACKAGE_TREE_DIR) : undefined;
    if (!tree || !existsSync(tree) || !statSync(tree).isDirectory())
      throw new Error(`Monster ${id} folded owner ${owner} requires an existing package tree directory`);
    const folded = (env.BLUSTONE_RESOURCE_ASSET_NAMES ?? "MAP_ZONE_1.jet,ST001.jet,M001.jet,MAIN_BG01.jet,MAIN_ICON.jet,SNOW.jet,UI_BATTLE.jet,UI_BATTLE2.jet")
      .split(",").map(name => path.basename(name.trim()));
    const patterns = (env.BLUSTONE_RESOURCE_ASSET_GLOB ?? "").split(",").map(value => value.trim()).filter(value => /^[A-Za-z0-9_.*?-]+$/.test(value));
    const matches = patterns.some(pattern => new RegExp("^" + pattern.replace(/[.+-]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i").test(owner));
    if (folded.includes(owner) || matches) {
      const preferred = path.join(packageDir, "E_NEW.jet");
      const base = existsSync(preferred) ? preferred : path.join(assetDir, "E_NEW.jet");
      // The server emits a folded group only when its selected parent exists.
      if (existsSync(base) && statSync(base).isFile()) {
        // Non-UI tree traversal emits only E_NEW.jet; other tree files cannot
        // shadow the separately folded original monster asset.
        file = path.join(assetDir, owner);
      }
    }
  }
  if (!file || !existsSync(file) || !statSync(file).isFile())
    throw new Error(`Monster ${id} requires selected/deliverable original owner ${owner}; namespace existence is not CDN coverage`);
  const pin = MONSTER_ART_PACKS.find(pack => pack.package === owner)!;
  const bytes = readFileSync(file);
  if (bytes.length !== pin.bytes || createHash("sha256").update(bytes).digest("hex") !== pin.sha256)
    throw new Error(`Monster ${id} owner ${owner} differs from pinned original bytes`);
  return owner;
}
