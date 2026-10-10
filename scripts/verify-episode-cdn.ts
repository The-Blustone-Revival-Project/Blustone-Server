/** Offline-host transport verification only; no Android/native gameplay claim. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "../src/server.js";

const packs = ["R_EPISODE.jet", "EPISODE.jet", "DIAL-EN.jet", "N001_BG.jet", "ST099.jet", "SND1.jet", "SND_CDN.jet",
  "VOICE_CDN2.jet", "VOICE_CDN6.jet", "C009.jet", "C009_Q.jet", "C009_EFT.jet", "C009_SND.jet"];
const root = path.resolve("..");
const separate = process.argv.includes("--separate");
const fishing = process.argv.includes("--fishing");
assert.ok(!fishing || separate, "Fishing verification requires --separate to preserve baseline E_NEW");
if (fishing) packs.push("FISHING.jet", "FISH_LIST.jet", "MGM_FISH.jet", "LEVELING.jet");
const stamp = fishing ? 1634667 : separate ? 1634666 : 1634664;
const assets = path.join(root, "recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets");
for (const name of packs) assert.ok(fs.existsSync(path.join(assets, name)), `Original pack missing: ${name}`);
const baseline = ["MAP_ZONE_1.jet", "ST001.jet", "M001.jet", "MAIN_BG01.jet", "MAIN_ICON.jet", "SNOW.jet", "UI_BATTLE.jet", "UI_BATTLE2.jet",
  ...fs.readdirSync(assets).filter((name) => /^C00[1-6](?:[A-Z_].*)?\.jet$/i.test(name))];
const basePackages = ["E_NEW.jet", "E_MIDAGE.jet", "PK_LM2.jet", "PK_LM4.jet", "PK_LM5.jet", "PK_MO3.jet", "PK_MO5.jet", "PK_MT3.jet", "PK_MT5.jet", "PK_WK1.jet", "VD_MISSION.jet"];
const packageNames = separate ? [...basePackages, ...packs] : ["E_NEW.jet"];
const settings = { BLUSTONE_PACKAGE_DIR: path.join(root, "analysis/runtime-package-full"),
  BLUSTONE_PACKAGE_TREE_DIR: path.join(root, "analysis/runtime-package-full"), BLUSTONE_PACKAGE_NAMES: packageNames.join(","),
  BLUSTONE_PACKAGE_MODE: "pkgi1-tree", BLUSTONE_RESOURCE_VERSION: String(stamp), BLUSTONE_RESLIST_STAMP: String(stamp),
  BLUSTONE_RESLIST_HEADER_STAMP: String(stamp),
  BLUSTONE_RESOURCE_ASSET_DIR: assets, BLUSTONE_RESOURCE_ASSET_NAMES: (separate ? baseline : packs).join(","),
  BLUSTONE_RESOURCE_ASSET_GLOB: "", BLUSTONE_FORCE_PACKAGE_RANGE: "0" };
const previous = new Map(Object.keys(settings).map((key) => [key, process.env[key]]));
Object.assign(process.env, settings);
const server = createApp({ baseUrl: "http://127.0.0.1" }).app.listen(0, "127.0.0.1");
try {
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const manifest = await (await fetch(`${base}/reslist_${stamp}.list`)).text();
  const manifestLines = manifest.trim().split("\n");
  assert.equal(Number(manifestLines[0]), stamp);
  assert.equal(Number(manifestLines[1]), packageNames.length);
  let totalSize = 0;
  for (const packageName of packageNames) {
    const nameWithoutExtension = packageName.slice(0, -4);
    const row = manifestLines.slice(3).find((line) => line.startsWith(`${nameWithoutExtension},`)); assert.ok(row);
    assert.equal(Number(row.split(",")[1]), stamp);
    const response = await fetch(`${base}/${nameWithoutExtension}_${stamp}.pkg`); assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, Number(row.split(",")[2])); totalSize += bytes.length;
    assert.equal(crypto.createHash("md5").update(bytes).digest("hex"), row.split(",")[5].trim().toLowerCase());
    const originalPath = basePackages.includes(packageName) ? path.join(settings.BLUSTONE_PACKAGE_DIR, packageName) : path.join(assets, packageName);
    assert.equal(crypto.createHash("md5").update(fs.readFileSync(originalPath)).digest("hex"), row.split(",")[4].toLowerCase());
    assert.equal(bytes.readUInt32LE(0), stamp);
    assert.equal(bytes.readUInt32LE(8), bytes.readUInt32LE(16));
    const entries = new Map<string, Buffer>();
    let pos = 20;
    for (let i = 0; i < bytes.readUInt32LE(16); i++) {
      const length = bytes[pos++]; const name = bytes.subarray(pos, pos + length).toString(); pos += length;
      const size = bytes.readUInt32LE(pos), offset = bytes.readUInt32LE(pos + 4); pos += 8;
      assert.ok(offset + size <= bytes.length); assert.ok(!entries.has(name));
      entries.set(name, bytes.subarray(offset, offset + size));
    }
    const expectedNames = packageName === "E_NEW.jet" ? [packageName, ...(separate ? baseline : packs)] : [packageName];
    assert.deepEqual([...entries.keys()].sort(), [...expectedNames].sort(), "Unexpected/missing package entries");
    for (const name of expectedNames) assert.deepEqual(entries.get(name), fs.readFileSync(name === packageName ? originalPath : path.join(assets, name)), `JET bytes altered/missing: ${name}`);
    if (separate && packageName === "E_NEW.jet") { assert.equal(entries.size, 47); assert.equal(bytes.length, 46929569); }
    const ranged = await fetch(`${base}/${nameWithoutExtension}_${stamp}.pkg`, { headers: { Range: "bytes=0-63" } });
    assert.equal(ranged.status, 206); assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), bytes.subarray(0, 64));
  }
  assert.equal(totalSize, Number(manifestLines[2]));
  console.log(`Episode${fishing ? "/Fishing" : ""} CDN verified (${separate ? "separate packages" : "folded"}): ${packs.length} original JET payloads byte-exact, PKGI1 offsets, inner/outer MD5, manifest sizes and range responses; native playback unverified.`);
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
}
