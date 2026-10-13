# Persistent local daily quest progression and gold claims

`BLUSTONE_QUEST_MODE=local-fixed` is opt-in, default disabled. It requires an
explicit `BLUSTONE_QUEST_POLICY_JSON` (also ServerState/createApp questPolicy).
No production quest catalogue, event predicate, calendar or numerical reward
is recovered. Configured references must declare local_ identities, type2,
complete native text/serial/target/option/reward fields, and gold-only rewards.
All other currency previews are zero and item/card lists empty. Original gold
receipt is reward.gold.cur; no generic user/Manda, EXP, Hunter or item grants
are invented. Reference schema validation does not authenticate provenance.

Policy has period_id, minimum_stage, references, rules and owners. The period
is fixed and explicit; no automatic daily reset/UTC calendar or ID recycling.
Changing config never rewrites a captured owner journal or claimed rights.
minimum_stage must name a published ordinary stage, and claims require earned
stars there. Native visibility also filters type2 quests until that stage is
clear. npc_id/go_to remain explicit strings; blank thumbnail metadata is
guarded by the native renderer, but does not constitute verified presentation
or a reconstructed shortcut. TODAY_QUEST aggregation remains absent.

Each rule is `{id:<local quest>,event:"mission-win",stage_id:<published stage
or null for any ordinary stage>}`. This mapping is declared LOCAL event policy.
Each owners entry supplies a complete list of `{daily_quest_id,is_rewarded,
cur_val}` for that owner. Already-earned imports may fund claims; references,
request target or catalogue membership never manufacture earned progress.
Owners without explicit instances retain prior empty reads/refused claims.

First supported read/lobby/mission initialization captures the complete owner
journal and persists once without granting rewards. This intentional metadata
initialization rolls back on failed save. References, rules, period and initial
progress detach from caller config. At most32 quests/10000 combined targets
and10000 tracked incrementing event IDs are supported local resource limits.
Every supplied reference has one unique instance. Targets are positive;
rewarded imports must already meet their target. Malformed/accessor/sparse
configurations and corrupt persisted journals refuse rather than defaulting.

Only a matching currently ACTIVE ordinary mission completion with STRICT
explicit native clear1 counts. Missing/malformed legacy clear defaults can
still settle their historical compatibility mission, but never earn a quest
step. Wrong stage/foreign battle identity/duplicate completion/defeat do not
increment. New winning replays of an already cleared stage do increment.
Counter growth stops at the configured target and after claiming. Event IDs
come from the server's accepted active snapshot, never request target data.
Native Complete requests omit battle IDs: a late same-stage completion after
another Start remains ambiguous. This is not original exactly-once/anti-cheat.

With local quests active, the ENTIRE mission mutation is planned on a detached
game clone (AP refund, Hunter EXP, capsules, mail/supply, stages, wallets,
missions and active battle removal). New quest progress and game settlement
persist in one snapshot. Actual temp-write/rename failure restores original
game fields/references, journal identity, active battle and durable bytes.
Legitimate retries can then settle the same pending attempt once.

Successful and refused result1 Complete replies include compatible quest
progress at ret_data directly. Native ReqCompleteCB Gb43d14 unconditionally
calls ParseLobbyEnter on that object; this is the positively recovered cache
update path. No invented achievement payload signals a refresh. Ordinary
no-quest replies include required neutral minimum-stage string/empty overlays.
GetRefList/GetInstList publish bare arrays; lobby Enter includes the same
minimum-stage/daily/linear headers. Daily rows upsert cached counters; [] does
not clear unrelated native linear state. A native tab also requests GetInstList;
direct scene entry only reads cached DATA. See quest-native-refresh-paths-
2026-10-14.md; earlier notes misidentified ParseAchievementsElement as a request
builder. That function parses separate achievement rows. Existing omission of
unreconstructed achievements remains policy, not a quest refresh mechanism.

Daily RequestReward validates the exact known id/target, cleared minimum stage,
earned count and safe uint32 wallet. Claim marks is_rewarded and credits supplied
gold atomically. A repeat rebases the CURRENT wallet and claimed progress without
another award or write, so later unrelated spending/earnings cannot be rewound.
Receipt contains dailyquest_min_stage, daily_quest, linear_quest:[] and
reward.gold:{cur}; ParseDailyQuestCompleteReward consumes these specialized
parents. Linear claims, calendar resets, achievements and additional reward
types remain unsupported. This producer has no separate paid/free currency
write or invented quest level/bonus.

Quest journals require state schema3, with quests and dispatches arrays. Prior
schema1/2 writers refuse this version rather than dropping earned/claimed state.
No-quest saves keep their prior schema. Disabling the mode retains journals and
read hydration, while claims/events stop. Restart does not reinitialize counts
or apply changed config. Private state, live policy, BlueStacks and APK unchanged.
Backend tests and actual encrypted HTTP establish lifecycle/atomicity; native
quest UI/thumbnail/shortcut validation remains pending.
