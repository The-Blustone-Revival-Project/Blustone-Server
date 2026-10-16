# Optional configured Mirage run

Continuation: [optional local first aid](mirage-local-first-aid-2026-10-17.md)
now supplies an explicitly priced Revive workflow for new policies. Statements
below about Revive being unavailable are historical for that opt-in extension;
original prices/caps and native UI remain unknown or unverified.

The server can now run one explicitly configured Mirage floor with real
owned Hunters: enroll, register a party, settle carried HP from End, claim
each stair's configured gold, advance to the next stair, and release the
party after completion. This is an opt-in **LOCAL lifecycle and content
projection**. Original floor/enemy/rotation/reward tables, numerical balance,
bonus multipliers, and reset/revive economics remain unrecovered.

The default mode is disabled. The completed encrypted HTTP proof uses
disposable authored accounts and a three-stair fixture; it is not a claim
of native Mirage battle UI validation or activation on a live profile.

## Resource and configuration admission

Use the prepared **`current-e6-mirage`** resource profile. Its original
Mirage artwork is separate from the configured gameplay policy. `createApp`
checks that MIRAGE.jet, ST002.jet, and LEVELING.jet are selected, have their
pinned byte lengths/SHA256 hashes, and use coherent positive signed32
resource-version/reslist/header stamps with a supported package layout.
The gate runs for an enabled mode and for restored captured runs even when
mutations are disabled. Selecting an arbitrary package with the same name
does not satisfy it. Pin owners are `src/mirage-resources.ts` and
`src/mirage-backgrounds.ts`; the prepared profile has 140 packages and
stamp1634687.

Set **both** `BLUSTONE_MIRAGE_MODE=local-configured` and
`BLUSTONE_MIRAGE_POLICY_JSON` to a complete JSON object. There are no
default enemy, gold, floor, bonus or reward values. Every stair's enemy
references, rank/EXP/skills and implicit baseline equipment must be supported
before enrollment; a later unsupported stair cannot be deferred until its
Reward response reaches the client. Asset/environment dependencies are
also validated before the initial capture.

The baseline policy fields are `enrollment`, `floor`, `bg_res`, `dlg_begin`,
`dlg_end`, `res_prefix`, `res_postfix_list`, `stairs`, and `hero`.
`enrollment` must be `rank-exp-id-projection`. Floor is positive signed32;
floors1..20 require exactly3 stairs,21..40 require6, and41+ require9.
Each stair requires grade0..3, positive signed32 `balance`, one through
five complete enemies at initial HP10000, and explicit gold0..INT32_MAX.
Both dialogue strings must currently be empty. `hero` requires explicit
nonnegative signed32 `bonus` and `end_ltime` plus `cur`/`next` reference-ID
arrays. The full policy is validated, canonically captured and immutable.

## Complete authored three-stair example

Every number below is an explicit fixture. Gold **7/11/13**, balance
**10000**, grade selection, enemy `003` at rank3/EXP0, and zero rotation
bonus are **not original Mirage balance**. Native HP full scale10000 and
the named resource identities have separate original-source evidence.
The balance consumer scales10000 to approximately1.0; that arithmetic does
not recover which original stair used that value. The INT32_MAX deadline
is an explicit example, not an original season date.

```json
{
  "enrollment": "rank-exp-id-projection",
  "floor": 1,
  "bg_res": "MIRAGE_BG_G",
  "dlg_begin": "",
  "dlg_end": "",
  "res_prefix": "MRG",
  "res_postfix_list": ["002"],
  "stairs": [
    {
      "grade": 0,
      "balance": 10000,
      "enemies": [{
        "ref_id": "003", "hp_percent": 10000, "rank": 3,
        "rank_up_cnt": 0, "overcome_cnt": 0, "exp": 0,
        "skill_1_level": 1, "skill_2_level": 1, "skill_3_level": 1,
        "skill_4_level": 0, "skill_5_level": 0
      }],
      "gold": 7
    },
    {
      "grade": 1,
      "balance": 10000,
      "enemies": [{
        "ref_id": "003", "hp_percent": 10000, "rank": 3,
        "rank_up_cnt": 0, "overcome_cnt": 0, "exp": 0,
        "skill_1_level": 1, "skill_2_level": 1, "skill_3_level": 1,
        "skill_4_level": 0, "skill_5_level": 0
      }],
      "gold": 11
    },
    {
      "grade": 2,
      "balance": 10000,
      "enemies": [{
        "ref_id": "003", "hp_percent": 10000, "rank": 3,
        "rank_up_cnt": 0, "overcome_cnt": 0, "exp": 0,
        "skill_1_level": 1, "skill_2_level": 1, "skill_3_level": 1,
        "skill_4_level": 0, "skill_5_level": 0
      }],
      "gold": 13
    }
  ],
  "hero": {"bonus": 0, "end_ltime": 2147483647, "cur": [], "next": []}
}
```

For an isolated local test, save that object as an ordinary local JSON file,
then supply its exact contents. For example, from the Server checkout:

```powershell
$env:BLUSTONE_MIRAGE_MODE = 'local-configured'
$env:BLUSTONE_MIRAGE_POLICY_JSON = Get-Content -LiteralPath '.\mirage-policy.json' -Raw
npm run build
node scripts/start-local.mjs --profile current-e6-mirage --state-file .\var\mirage-local.json --host 127.0.0.1 --base-url http://127.0.0.1:8080
```

The profile remains marked prepared-only because resource preparation is not
native play validation. This example does not enable the mode by merely
selecting that resource profile; the two explicit mode/policy variables are
still required. `.env.example` is documentation and is not automatically
loaded by npm.

## Owned enrollment and captured commitments

The first valid non-reset GetInfo request creates the configured run only
when the mode/policy, content and owned state pass admission. An explicitly
all-zero section request returns an empty read without creating a run or
changing HP. This is not an implicit migration based on HP1000.

The supported initial account must have no unrepresented historical carry:
every old owned `mirage_remain_hp` must be absent or the revival's historical
LOCAL1000 placeholder. The server selects one supported ordinary Hunter per
published **`char_id` family**, ordered by highest current rank, then highest
EXP, then lowest owned instance ID. That ranking is explicitly LOCAL; the
original combat-power enrollment law is unknown. The chosen existing Hunters
receive carried HP10000; other owned Hunters receive unentered sentinel-1.
No Hunter, rank, EXP, skill, equipment, item or currency is granted.

Initial registered Mirage deck is empty. RegisterDeck chooses one through
five living enrolled Hunters, with distinct instances and native character
families. It changes only the captured selected party and preserves entry
membership and carried HP. The record does not alias the ordinary party.
Card/combat commitment mutations are locally held while a run is active;
the hold also remains when that captured run is read with mutations disabled.

The first initialization captures schema12 with the complete policy, entries,
current party, enemies, claim prefix and any last End receipt. Reopening
GetInfo or restarting preserves that captured attempt. A different configured
policy refuses startup rather than retuning its enemies, effects or payouts.
The deadline admits **new** enrollment. A captured run validates combat
against its captured entry time and frozen policy through completion or
abandonment; its wire deadline is not silently rewritten. Native countdown
UI behavior after expiry remains unvalidated.

## End, reward, retries, and release

End binds the exact floor/stair, registered owned IDs, and enemy-camp size.
Its supported HP values are integers0..10000, with exactly one surviving
camp. All-zero/ambiguous outcomes refuse. A win moves the captured stair to
state2; a loss retains state1 with player/enemy carry. Another living party
can register after a loss without healing the enemies. Identical End retries
return the captured receipt without another write or HP debit; foreign or
extra IDs cannot match that retry record.

Reward credits the configured current stair gold once, advances its claimed
prefix, clears the End receipt and supplies the next stair/enemy cache inline.
Claimed-prefix retries return the **CURRENT** cache and gold
`{prev:current,cur:current}` without another award, write, or rewind to an
older stair. No AP/BP charge or item/Gem/EXP reward is introduced.

After the final stair, state becomes0, `highest` becomes the completed floor,
and entry/registered deck are cleared. Owned HP returns to the historical
LOCAL1000 placeholder atomically with the final claim. This LOCAL release
removes commitment holds while retaining the captured policy/highest/claims;
it is not a new heal, re-entry attempt, or original floor-reset law. Accepted
same-server mutually unblocked friends can see actual highest-cleared-floor
records through the existing friend-floor DTO.

GetInfo **`reset:"1"`** has one explicit LOCAL meaning in this mode:
**abandon the existing captured attempt**. It releases entry/party/owned HP,
clears pending End, sets state0/highest0, and preserves the already-paid
claim prefix, current stair, enemy carry and policy. A pending unclaimed
reward is discarded without payment. The journal records `abandoned:true`;
it never pretends the whole floor was cleared. This provides an exit for
depleted parties. Reset with no existing run or with mutations disabled
refuses. Repeated resets of completed/abandoned records are reads with no
additional writes or grants. Neither `stay` value creates a fresh attempt.

Original Revive, GetNextFloor, re-entry, floor assignment, reset costs/quotas
and rotation production remain unsupported. The original requester vocabulary
does not establish those backend laws.

## Disable and verification boundary

Unset **both** Mirage variables to disable mutations. Captured schema12
records still hydrate their policy/cache through GetInfo; active commitment
holds remain until the identical policy is explicitly re-enabled and the
attempt is completed or abandoned. Keep compatible selected original
resources for captured records; disabling the mode does not bypass CDN pins.

The compiled encrypted HTTP test proves three stair claims totaling31
fixture gold, exact ownership/carry, retry repair, final release, persistence,
and restart with retained transport identity. State/pure tests also cover
loss-party carry, expiration admission, reward-free abandonment and real
write/rename rollback. These are server/transport proofs; no live profile,
emulator input or actual native Mirage battle is claimed here.

Native evidence: [GetInfo/enrollment boundary](mirage-getinfo-enrollment-boundary-2026-10-17.md),
[character-family owner correction](mirage-character-family-owner-correction-2026-10-17.md),
[registration](mirage-register-deck-native-2026-10-14.md),
[End/carry](mirage-end-carry-transition-native-2026-10-14.md),
[Reward/cache transition](mirage-reward-cache-transition-native-2026-10-14.md),
[original JET resources](mirage-native-jet-name-index-2026-10-16.md), and
[original background prefixes](mirage-original-common-background-prefixes-2026-10-16.md).
