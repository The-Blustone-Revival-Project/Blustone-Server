# Configured linear quest sequences

The existing local-fixed quest mode optionally accepts a `linear` object with
complete type3 `references` and matching mission-win `rules`. It uses the same
fixed period/minimum stage/explicit owners as daily quests. Every enrolled
sequence starts at index0/current0; no earned linear progress is manufactured.
Records, gold rewards, ordering and event mappings are explicit LOCAL policy,
not original quest catalogue, calendar or numerical balance.

Daily and linear IDs must be unique across the captured policy. Linear serials
are positive, strictly increasing configured uint32 values; they remain distinct
from the separately persisted array index. Each row needs one known rule, full
native text/target/option/reward preview data and gold-only rewards. At most32
rows per component and10000 combined daily/linear target steps are supported,
keeping the shared distinct incrementing-event history bounded. Blank metadata
is not proof of thumbnails, original shortcuts or native UI presentation.

Only the current linear row earns a step from its matching strictly accepted
ordinary mission win. Daily counters can progress in parallel, while future
linear rows cannot pre-earn. Duplicate/no-active/wrong-stage/loss/malformed-clear
completions retain existing refusal rules. Reaching target does not advance:
`/linearquest/Reward` requires exact id, serial and target plus earned progress
and minimum-stage stars. It atomically credits supplied gold, increments index
and resets current count. Subsequent mission events start the next row.

Claims for already completed prefix rows rebase CURRENT wallet and CURRENT
linear/daily overlays with no award/write/rewind. Future or unknown claims
refuse. Completed prefix is derived from index, not a freely supplied claimed
list. Restore checks index/count and minimum event-history consistency; corrupt
sequences fail before rewriting a save. No original nonce or exactly-once wire
guarantee is inferred; native same-stage completion ambiguity remains.

Source correction: both GetRefList daily previews and full linear rows require
`reward` as JSON STRING. The internal model/journal keeps structured objects,
encoded once at publication. Successful claim `ret_data.reward` is separately
an OBJECT with guarded absolute gold.cur. The previous daily reference object
wire was wrong and is corrected; no private data or APK migration is required.
See quest-reward-string-wire-correction-2026-10-16.md.

Native cache has one replaceable type3 slot. Each current publication sends one
full row, not the whole future ladder. On final completion it sends a complete
empty-ID row: title/desc/id/npc_id/go_to empty strings, serial/target_val/
option_val/cur_val zeros, and JSON-string reward with all eight currencies0 and
empty item/card lists. Parsing occurs BEFORE empty-ID removal. `{}`, null or
`linear_quest:[]` cannot safely clear the slot. Legacy daily-only replies still
use[], preserving their existing unrelated native linear cache.

Mission settlement, claims and enrollment use existing atomic persistence and
restore all game/journal references on actual write/rename failure. Captured
sequences survive policy reorder/repricing and disabled-mode restart. Changing
policy does NOT attach a ladder to an already captured schema3 daily journal;
no silent enrollment/reset or live migration is offered. New linear-bearing
saves require schema4; older1/2/3 writers refuse it. Daily-only saves remain3.

Pure, state and real signed P384/AES HTTP tests cover parallel/current-only
progress, exact preview encoding, full terminal removal, prefix replay after
later gains/progress, overflow/refusal, real disk failures, schema corruption,
legacy preservation, restart and peers. All records are authored test fixtures.
Native quest UI validation remains pending; no live policy/private progress/
input/APK or DataDump changes. Original records, resets and other rewards stay
unreconstructed; the overall revival goal remains active.
