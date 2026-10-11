import assert from "node:assert/strict";
import { ServerState } from "../src/state.js";
import { gameResponse } from "../src/game-routes.js";
import fs from "node:fs";
import { repositoryPath } from "../src/paths.js";
import { QUEST_CURRENCY_FIELDS, QUEST_NATIVE_EVIDENCE, ingestQuestReferences, ingestDailyQuestInstances,
  questRewardIdentity, questRewardRequestKeys } from "../src/quest-contracts.js";

const strings = fs.readFileSync(repositoryPath("resources/reference/native-all-strings.tsv"), "utf8");
const locators = JSON.parse(fs.readFileSync(repositoryPath("docs/quest-native-key-locators-2026-10-11.json"), "utf8"));
assert.equal(locators.originalLibrarySha256, QUEST_NATIVE_EVIDENCE.originalLibrarySha256);
for (const key of QUEST_CURRENCY_FIELDS) assert.ok(locators.consumers.QuestReference.some((row: any) => row.text === key));
for (const key of [...QUEST_CURRENCY_FIELDS, ...QUEST_NATIVE_EVIDENCE.lobby.fields,
  ...QUEST_NATIVE_EVIDENCE.dailyInstance.fields, ...QUEST_NATIVE_EVIDENCE.rewardRequest.dailyFields,
  ...QUEST_NATIVE_EVIDENCE.rewardRequest.linearFields, QUEST_NATIVE_EVIDENCE.reference.route,
  QUEST_NATIVE_EVIDENCE.nativeSummaryIdentity, QUEST_NATIVE_EVIDENCE.rewardRequest.dailyPathLiteral,
  QUEST_NATIVE_EVIDENCE.rewardRequest.linearPathLiteral]) {
  // The preserved printable-string inventory omits two-character literals;
  // ap/bp are separately pinned by their original ELF literal-read locators.
  if (key.length >= 3) assert.ok(strings.includes(`\t${key}\n`) || strings.includes(`\t${key}\r\n`), `Original literal ${key}`);
}

assert.deepEqual(ingestQuestReferences([], new Set()), [], "no production reference identities have been invented");
// Entirely disposable grammar fixtures. These IDs and values are not recovered
// quest data and are never published or settled by the implementation.
const fixtureReward = { ...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key => [key, 0])),
  item_list: [{ ref_id: "contract-test-item", qty: 2 }], card_list: [] };
const fixture = { type: 1, title: "Contract test", desc: "%t/%o", desc_noti: "", id: "contract-test-only",
  npc_id: "", go_to: "", serial: 1, target_val: 5, option_val: 7, reward: fixtureReward };
const before = JSON.stringify(fixture);
assert.throws(() => ingestQuestReferences([fixture], new Set()), /Unknown/);
const references = ingestQuestReferences([fixture], new Set([fixture.id]));
assert.equal(JSON.stringify(fixture), before, "ingestion cannot mutate source records");
assert.deepEqual(references[0].reward.item_list, fixtureReward.item_list, "symbolic identity stays an identity, not currency mapping");
references[0].reward.item_list[0].qty = 99;
assert.equal(fixtureReward.item_list[0].qty, 2);
assert.throws(() => ingestQuestReferences({ list: [fixture] }, new Set([fixture.id])), /bare array/);
assert.throws(() => ingestQuestReferences([fixture, fixture], new Set([fixture.id])), /duplicate/);
assert.throws(() => ingestQuestReferences([{ ...fixture, go_to: undefined }], new Set([fixture.id])), /go_to/);
assert.throws(() => questRewardIdentity({ ...fixtureReward, item_list: [{ id: "achievement-format", qty: 1 }] }), /ref_id/);
assert.throws(() => questRewardIdentity({ ...fixtureReward, gold: undefined }), /gold/);
for (const invalid of [-1, 1.5, Infinity, 0x100000000, "5", true])
  assert.throws(() => ingestQuestReferences([{ ...fixture, target_val: invalid }], new Set([fixture.id])), /target_val/);
const instance = { daily_quest_id: fixture.id, is_rewarded: 0, cur_val: 2 };
assert.deepEqual(ingestDailyQuestInstances([instance], references), [instance]);
assert.throws(() => ingestDailyQuestInstances([instance], []), /Unknown/);
assert.throws(() => ingestDailyQuestInstances([instance, instance], references), /duplicate/);
assert.throws(() => ingestDailyQuestInstances([{ ...instance, is_rewarded: 2 }], references), /flag/);
assert.deepEqual(questRewardRequestKeys(references[0]), { pathLiteral: "dailyquest/RequestReward",
  payload: { daily_quest_id: fixture.id, target_val: 5 } });
assert.deepEqual(questRewardRequestKeys({ ...references[0], type: 3 }), { pathLiteral: "linearquest/Reward",
  payload: { serial: 1, id: fixture.id, target_val: 5 } });
const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "quest-empty-contract" }, {}).ret_data as any;
const game = state.gameFor(state.accountFor(auth, {}));
const saved = JSON.stringify(game);
for (const route of ["/dailyquest/GetRefList", "/dailyquest/GetInstList"]) {
  const reply = gameResponse(state, route, auth) as any;
  assert.equal(reply.result_code, 1);
  assert.deepEqual(reply.ret_data, [], "absent production catalogue is a native collection, not mock metadata");
  assert.throws(() => gameResponse(state, route, {}), /authenticated account required/);
}
for (const route of ["/dailyquest/RequestReward", "/linearquest/Reward"]) {
  assert.equal((gameResponse(state, route, { ...auth, daily_quest_id: "TEST_ONLY_QUEST", id: "TEST_ONLY_QUEST", serial: 1, target_val: 5 }) as any).result_code, 2001);
  assert.throws(() => gameResponse(state, route, {}), /authenticated account required/);
}
assert.equal(JSON.stringify(game), saved, "empty quest reads and missing-data claims preserve every owned field");
console.log("Quest blueprint: exact native collection/key namespaces, approved-ID ingestion, symbolic rewards, authenticated empty reads/refused claims; no production quests or settlement fabricated.");
