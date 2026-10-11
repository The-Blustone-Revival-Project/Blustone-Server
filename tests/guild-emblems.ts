import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { GUILD_EMBLEM_SOURCE, GUILD_PICKER_UI_SOURCE, GUILD_PICKER_EMBLEMS, GUILD_SPRITE_EMBLEMS, isGuildPickerEmblem,
  jetRecordHeaders, verifyGuildEmblemSource } from "../src/guild-emblems.js";

const bytes = readFileSync(new URL("../resources/runtime/assets/GUILD.jet", import.meta.url));
const report = verifyGuildEmblemSource(bytes);
assert.equal(report.originalBytes, 2258272);
assert.equal(report.fallbackSprite, "GD_IMG_1");
assert.deepEqual(report.sprites.filter((sprite) => sprite.picker).map((sprite) => sprite.id), GUILD_PICKER_EMBLEMS);
assert.deepEqual(report.sprites.map((sprite) => sprite.id), GUILD_SPRITE_EMBLEMS);
assert.ok(report.sprites.every((sprite) => sprite.sourceBytes === 66 && /^[a-f0-9]{64}$/.test(sprite.sha256)));
assert.ok(isGuildPickerEmblem("GD_IMG_6"));
for (const bad of [1, "1", "GUILD", "GUILD.jet", "GD_IMG_7", "GD_IMG_10", "GD_IMG_0", "gd_img_1", "GD_IMG_1.png", "https://example.com/icon.png"])
  assert.equal(isGuildPickerEmblem(bad), false, "Do not infer selectable emblem IDs or uploaded-URL support");
const corrupt = Buffer.from(bytes); corrupt[24] ^= 1;
assert.throws(() => verifyGuildEmblemSource(corrupt), /pin mismatch/);
assert.throws(() => verifyGuildEmblemSource(bytes.subarray(0, bytes.length - 1)), /pin mismatch/);
assert.throws(() => jetRecordHeaders(Buffer.alloc(23)), /Truncated/);
const truncated = Buffer.alloc(24); truncated.writeUInt32LE(1, 8);
assert.throws(() => jetRecordHeaders(truncated), /payload extent/);
// Authored single record checks header-name arithmetic independently of pins.
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._";
const synthetic = Buffer.alloc(26); synthetic.writeUInt32LE(2, 0); synthetic.writeUInt32LE(2, 8);
let encoded = 0n;
for (const char of "GD_IMG_1") encoded = encoded * 38n + BigInt(alphabet.indexOf(char));
synthetic.writeBigUInt64LE(encoded, 12); synthetic.write("S2", 24);
assert.deepEqual(jetRecordHeaders(synthetic), [{ name: "GD_IMG_1", offset: 0, payloadOffset: 24, packedBytes: 2, rawBytes: 2 }]);
assert.equal(GUILD_EMBLEM_SOURCE.path, "resources/runtime/assets/GUILD.jet");
const ui = readFileSync(new URL("../" + GUILD_PICKER_UI_SOURCE.path, import.meta.url));
assert.equal(createHash("sha256").update(ui).digest("hex"), GUILD_PICKER_UI_SOURCE.sha256,
  "Original UI record source changed; revalidate selector bindings before admitting stock IDs");
const metadata = JSON.parse(readFileSync(new URL("../resources/reference/guild-emblems.json", import.meta.url), "utf8"));
assert.deepEqual(metadata.verified, report);
assert.equal(metadata.ui_source.sha256, GUILD_PICKER_UI_SOURCE.sha256);
assert.deepEqual(metadata.ui_source.records.map((record: any) => record.key), ["EN/GUILD/G_P_ICON", "KO/GUILD/G_P_ICON"]);
for (const record of metadata.ui_source.records) {
  assert.equal(record.sha256, "cb33d05f90b7de0d9736750d3c61e038fff7df12c0eaef4eeba5c0b7531fe34c");
  assert.deepEqual(record.bindings.map((binding: any) => binding.res_name), GUILD_PICKER_EMBLEMS);
  assert.ok(record.bindings.every((binding: any, index: number) => binding.button === `BT_THUMB${index + 1}` && binding.child === "SPR_RANK"));
}
console.log(`Guild emblems: six original picker IDs/ten real S2 sprites, ${report.records} complete native JET headers, whole-source pins and corruption/name-guess refusals passed; fees remain gated.`);
