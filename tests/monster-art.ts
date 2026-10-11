import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { repositoryPath } from "../src/paths.js";
import { MONSTER_ART_PACKS, MONSTER_ART_OWNER, RECOVERED_MONSTER_NAMESPACES, requireSelectedMonsterArt } from "../src/monster-art.js";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._";
function b38(value: bigint) {
  let name = "";
  do { name = alphabet[Number(value % 38n)] + name; value /= 38n; } while (value);
  return name;
}
assert.equal(RECOVERED_MONSTER_NAMESPACES.length, 64);
assert.equal(MONSTER_ART_OWNER.M022, "M008.jet");
assert.equal(MONSTER_ART_OWNER.M024, "M008.jet");
assert.equal(MONSTER_ART_OWNER.M008, "M003.jet", "actor008 is not owned by pack008");
assert.equal(MONSTER_ART_OWNER.M063, "M021.jet");
assert.equal(MONSTER_ART_OWNER.M100, "M100.jet");
assert.ok(!RECOVERED_MONSTER_NAMESPACES.includes("M064"));
const imported = JSON.parse(readFileSync(repositoryPath("resources/manifests/imported-files.json"), "utf8"));
for (const pin of MONSTER_ART_PACKS) {
  const bytes = readFileSync(repositoryPath("resources/runtime/assets", pin.package));
  const source = imported.find((row: any) => row.destination === `resources/runtime/assets/${pin.package}`);
  assert.deepEqual([pin.bytes, pin.sha256, pin.source], [source.bytes, source.sha256, source.source]);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), pin.sha256);
  const names: Record<string, string[]> = {};
  let offset = 0, count = 0;
  while (offset < bytes.length) {
    assert.ok(offset + 24 <= bytes.length);
    const packed = bytes.readUInt32LE(offset + 8);
    assert.ok(packed > 0 && offset + 24 + packed <= bytes.length);
    const name = b38(bytes.readBigUInt64LE(offset + 12));
    const match = /^(M\d{3})_/.exec(name);
    if (match) (names[match[1]] ??= []).push(name);
    offset += 24 + packed; count++;
  }
  for (const list of Object.values(names)) list.sort();
  assert.equal(offset, bytes.length);
  assert.equal(count, pin.recordCount);
  assert.deepEqual(names, pin.namespaces, "every admitted actor has exact original owner record names");
}
const baseEnv = { BLUSTONE_PACKAGE_DIR: repositoryPath("resources/runtime/packages"),
  BLUSTONE_RESOURCE_ASSET_DIR: repositoryPath("resources/runtime/assets"), BLUSTONE_PACKAGE_MODE: "pkgi1-tree",
  BLUSTONE_PACKAGE_TREE_DIR: repositoryPath("resources/runtime/packages") };
assert.equal(requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "M008.jet" }), "M008.jet");
assert.throws(() => requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "M022.jet" }), /requires selected/);
assert.throws(() => requireSelectedMonsterArt("M008", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "M008.jet" }), /M003.jet/);
assert.throws(() => requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "M008.jet", BLUSTONE_PACKAGE_MODE: "empty" }), /requires selected/);
assert.equal(requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "E_NEW.jet", BLUSTONE_RESOURCE_ASSET_NAMES: "M008.jet" }), "M008.jet");
assert.equal(requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "E_NEW.jet", BLUSTONE_RESOURCE_ASSET_NAMES: ",", BLUSTONE_RESOURCE_ASSET_GLOB: "M00?.jet" }), "M008.jet");
for (const id of ["M000", "M064", "M099", "001", "C001", "M008.jet", "__proto__"])
  assert.throws(() => requireSelectedMonsterArt(id, baseEnv), /Unknown/);
const temp = mkdtempSync(path.join(tmpdir(), "blustone-monster-owner-"));
try {
  for (const tree of [undefined, path.join(temp, "missing")])
    assert.throws(() => requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "E_NEW.jet",
      BLUSTONE_RESOURCE_ASSET_NAMES: "M008.jet", BLUSTONE_PACKAGE_TREE_DIR: tree }), /tree directory/);
  writeFileSync(path.join(temp, "M008.jet"), "wrong preferred owner bytes");
  assert.throws(() => requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "E_NEW.jet",
    BLUSTONE_RESOURCE_ASSET_NAMES: "M008.jet", BLUSTONE_PACKAGE_TREE_DIR: path.join(temp, "M008.jet") }), /tree directory/);
  assert.equal(requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_NAMES: "E_NEW.jet",
    BLUSTONE_RESOURCE_ASSET_NAMES: "M008.jet", BLUSTONE_PACKAGE_TREE_DIR: temp }), "M008.jet", "unrelated tree M008 file is skipped, so it cannot shadow valid folded original");
  assert.throws(() => requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_DIR: temp, BLUSTONE_PACKAGE_NAMES: "M008.jet" }), /pinned original/);
  assert.throws(() => requireSelectedMonsterArt("M022", { ...baseEnv, BLUSTONE_PACKAGE_DIR: temp, BLUSTONE_RESOURCE_ASSET_DIR: temp,
    BLUSTONE_PACKAGE_NAMES: "E_NEW.jet", BLUSTONE_RESOURCE_ASSET_NAMES: "M008.jet" }), /requires selected/);
} finally { rmSync(temp, { recursive: true, force: true }); }
function bootstrap(ids?: string, packages = "M001.jet,M008.jet") {
  const env = { ...process.env, ...baseEnv, BLUSTONE_PACKAGE_NAMES: packages,
    BLUSTONE_RESOURCE_ASSET_NAMES: ",", BLUSTONE_MONSTER_IDS: ids };
  if (ids === undefined) delete env.BLUSTONE_MONSTER_IDS;
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import * as b from './src/bootstrap.ts';console.log(JSON.stringify({ids:b.FIXTURE_MONSTER_IDS,
      table:b.starterMonsterTable,inventory:b.starterInventory,levels:b.starterLevels}));`],
    { cwd: repositoryPath(), env, encoding: "utf8", timeout: 20_000 });
}
const original = bootstrap(), empty = bootstrap(""), explicit = bootstrap("M001"), genuine = bootstrap("M001,M022");
for (const result of [original, empty, explicit, genuine]) assert.equal(result.status, 0, result.stderr);
assert.equal(original.stdout, empty.stdout);
assert.equal(original.stdout, explicit.stdout, "defaultM001 serialization/stat/progression fixtures unchanged");
const defaultData = JSON.parse(original.stdout), wide = JSON.parse(genuine.stdout);
assert.deepEqual(wide.table.M001, defaultData.table.M001);
assert.equal(wide.table.M022.res_prefix, "M022", "render prefix stays actor namespace, not owner pack M008");
assert.deepEqual([wide.table.M022.hp, wide.table.M022.atk, wide.table.M022.def], ["100", "10", "5"], "existing independent neutral fixture policy unchanged");
assert.deepEqual(wide.inventory, defaultData.inventory);
assert.deepEqual(wide.levels, defaultData.levels);
assert.notEqual(bootstrap("M022", "M001.jet").status, 0, "genuine namespace cannot bypass owner selection");
assert.notEqual(bootstrap("M064", "M021.jet").status, 0);
console.log("Monster art:64 genuine actor IDs/22 exact owner packs; selected/folded/source-hash gates, M022 positive/M064 negative and unchanged default/stat/ownership policy passed.");
