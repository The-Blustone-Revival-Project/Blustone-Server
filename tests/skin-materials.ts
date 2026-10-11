import assert from "node:assert/strict";
import { ServerState } from "../src/state.js";
import { gameResponse } from "../src/game-routes.js";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { repositoryPath } from "../src/paths.js";
import { SKIN_NATIVE_EVIDENCE, STARTER_SKIN_MATERIALS, starterDefaultSkinIdentity, starterSkinAvailability, ingestOwnedSkinInstances } from "../src/skin-materials.js";

const profile = JSON.parse(fs.readFileSync(repositoryPath("config/profiles/current-e6.json"), "utf8"));
const availability = starterSkinAvailability(profile.env.BLUSTONE_PACKAGE_NAMES.split(","));
assert.equal(availability.length, 11);
assert.equal(availability.filter(row => row.defaultBody).length, 4);
assert.equal(availability.filter(row => !row.defaultBody).length, 7);
assert.ok(availability.every(row => row.artSelected));
assert.ok(availability.filter(row => !row.defaultBody).every(row => row.skinRefId === null && row.wearableGrant === false));
for (const id of ["001", "002", "003", "004"]) {
  const identity = starterDefaultSkinIdentity(id);
  assert.equal(identity.skinRefId, `Default_${id}`);
  assert.equal(identity.targetCardRefId, id);
  assert.equal(identity.resPrefix, `C${id}`);
  assert.equal(identity.serverInstancePublished, false);
}
for (const id of ["C001A", "001A", "1000001", "Default_001", "005"])
  assert.throws(() => starterDefaultSkinIdentity(id), /Unknown/, "native default ID cannot be derived from owned-instance or art namespace");
assert.equal(starterSkinAvailability(["C003A.jet"]).find(row => row.resPrefix === "C003A")!.artSelected, false);
(availability[0].packs[0] as any).name = "caller-only";
assert.notEqual(starterSkinAvailability([])[0].packs[0].name, "caller-only");
for (const material of STARTER_SKIN_MATERIALS) for (const pack of material.packs) {
  const bytes = fs.readFileSync(repositoryPath("resources/runtime/assets", pack.name));
  assert.equal(bytes.length, pack.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), pack.sha256);
}
const locators = JSON.parse(fs.readFileSync(repositoryPath("docs/skin-native-key-locators-2026-10-11.json"), "utf8"));
assert.equal(locators.librarySha256, SKIN_NATIVE_EVIDENCE.librarySha256);
for (const field of SKIN_NATIVE_EVIDENCE.referenceParser.fields) assert.ok(locators.consumers.SkinRefRow.some((row: any) => row.text === field));
for (const field of SKIN_NATIVE_EVIDENCE.instanceParser.fields) assert.ok(locators.consumers.SkinInstRow.some((row: any) => row.text === field));
assert.ok(locators.consumers.SkinDefaultRef.some((row: any) => row.text === "Default_"));
assert.deepEqual(ingestOwnedSkinInstances({ skin: [] }, new Set()), [], "no costume ownership invented");
const fixture = { inst_id: 7, ref_id: "contract-test-only", is_seen: 0, is_equiped: 1 };
assert.throws(() => ingestOwnedSkinInstances({ skin: [fixture] }, new Set()), /Unknown/);
assert.deepEqual(ingestOwnedSkinInstances({ skin: [fixture] }, new Set([fixture.ref_id])), [fixture]);
assert.throws(() => ingestOwnedSkinInstances([fixture], new Set([fixture.ref_id])), /skin array/);
assert.throws(() => ingestOwnedSkinInstances({ skin: [fixture, fixture] }, new Set([fixture.ref_id])), /duplicate/);
assert.throws(() => ingestOwnedSkinInstances({ skin: [{ ...fixture, is_equipped: 1, is_equiped: undefined }] }, new Set([fixture.ref_id])), /flags/);
assert.throws(() => ingestOwnedSkinInstances({ skin: [{ ...fixture, inst_id: 2 ** 53 }] }, new Set([fixture.ref_id])), /identity/);
const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "native-default-skin-only" }, {}).ret_data as any;
const game = state.gameFor(state.accountFor(auth, {}));
const beforeRead = JSON.stringify(game);
assert.deepEqual((gameResponse(state, "/reference/GetSkinRef", auth) as any).ret_data, { skin: [], bonus: [] });
assert.deepEqual((gameResponse(state, "/lobby/GetSkinInst", auth) as any).ret_data, { skin: [] });
for (const route of ["/skin/Seen", "/skin/PutOn", "/skin/Buy", "/skin/Gacha"])
  assert.equal((gameResponse(state, route, auth) as any).result_code, 2001);
assert.equal(JSON.stringify(game), beforeRead);
assert.throws(() => gameResponse(state, "/lobby/GetSkinInst", {}), /authenticated account required/);
game.starter_cards[0].skin_ref_id = "TEST_ONLY_UNKNOWN_PAID_SKIN";
const preservedUnknown = JSON.stringify(game);
assert.equal((gameResponse(state, "/lobby/GetSkinInst", auth) as any).result_code, 2001, "unreconstructed saved ownership must not be cleared by an empty reply");
assert.equal((gameResponse(state, "/reference/GetSkinRef", auth) as any).result_code, 2001, "unknown saved style references must not be erased during reference reload");
assert.equal(JSON.stringify(game), preservedUnknown);
console.log("Skin readiness:4 native defaults,7 art pairs/22 hashes, exact empty-read grammar and unknown ownership/purchase guards; no paid grants.");
