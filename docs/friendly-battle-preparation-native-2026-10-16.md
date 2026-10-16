# Friendly battle preparation: exact contract and unresolved admission

Implementation follow-up: [optional local-owned-defense preparation](friendly-battle-local-defense-2026-10-16.md)
now projects real accepted friends with response-only card and Gem aliases,
explicit deck policy and read-only state handling. Default remains guarded.
Historical blocker statements below describe the original collision boundary;
the new host-tested mapping does not yet claim native scene validation.

## Follow-up: real friendly scene and local result branch

Further bounded original inspection closes the downstream scene selection:
the user-info continuation Gd980c0 checks result1 atGd980e2, writes the local
`rival_pvid` marker with SetMarker64 atGd98148, then pushes scene0x54 through
PushSceneFadeOutIn atGd98178. The special failure10177 (0x27c1) selects the
ONLY_FRIENDS literal atGd98182→G1d877de. This proves a friend-only error
presentation, not a complete original backend admission law.

The continuation belongs to OnButtonClick::$_1: original RTTI is recorded in
native-all-strings.tsv line460639 and the vtable atG217a7ec resolves its
operator toGd980c0. Data PT_LOAD mapping uses ELF file offset=VA−0x1000 before
applying the Ghidra image base; an adjacent callback is not substituted.

The scene0x54 RequestBattleWith branch bypasses the normal CalcTotalBP gate.
CSRFC.OnFinishG947b6a tests the previous scene and takes a local friendly-result
branch for0x54: G947f0a constructs FCFriendlyResult andG947f20 calls SetData.
The normal network-complete call atG947e06 is on the other branch. This closes
more of the free/local-result flow without authorizing Arena fees or rewards.

Runtime GetFriendlyBattleInfo remains guarded. Account-local owned card IDs
still collide across users in the native full-serial actor lookup. A subsequent
implementation must prove a coherent collision-free transient rival projection,
deck policy and gem/bonus handling before enabling the callback's automatic
scene transition. No live friendly battle, fee, honor award or state mutation
was performed by this audit. Earlier downstream uncertainty statements below
are historical where superseded by this section; the identity boundary remains.

Original ARM SHA256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded read-only original Thumb inspection and existing published DataDump
source; Ghidra code coordinates below equal ELF code offsets plus0x10000.
No runtime, save, client, original binary or DataDump file was changed.

## Request and matched callback

CSRSyncGlobal.RequestFriendlyBattleDeckInfo Gf67368 takes a captured
SRTARGET_USER and continuation. The request serializes standard auth5 plus
target_pvid. Gf674ca loads both target identity words; Gf674d0 converts
the full64 identity; target_pvid literal is Gf674d4..4dc. The route literal
is /world/GetFriendlyBattleInfo at Gf675fa. There is no target deck selector,
payment field, battle nonce, supplied enemy list or client-selected balance.
The exact exported owners are named in
sources/native/symbols/native-evidence.tsv:22629–22630.

ReqFriendlyBattleDeckInfoCB Gf67a34 obtains GetResultCode at Gf67ac4 and
requires1 at Gf67aca..acc. Success selects full response.ret_data at
Gf67bd2..bda, then child rival at Gf67be4..bec, and explicitly invokes
CSRFCPlayData.ParseFreindlyBattleRival G944790 at Gf67bf4. Failure skips that
cache parse and still passes the result code to its continuation.

ParseFreindlyBattleRival (original misspelling) explicitly calls ParseDefender
G943958 at G9447ac, then moves the resulting BATTLE_ENEMY into its FC cache
at G9447b4. Thus this route uses that parser because of an established call,
not merely because its name resembles an Arena route. It prepares opponent
data; this callback does not debit resources, issue an admission token,
settle a fight or award a victory. Downstream native friendly scene/start/
finish behavior is not fully established by this callback.

## Complete rival shape

Successful canonical envelope is ret_data:{rival:<full opponent object>}.
Primary parser source is
sources/native/systems/ghidra-arena-lobby-helpers.txt:762 onwards, with
literal locators in sources/native/strings/ghidra-arena-corrected-strings.txt.

- chain_bonus: collection of {ref_id:STRING,atk:UINT32,def:UINT32,hp:UINT32}.
- card_book: object containing atk/def/hp/crt_chance/crt_dmg numeric words.
  The parser scales atk/def/hp by10000 in its internal representation.
  Those scale operations do not recover original aggregate production laws.
- nickname, thumbnail, profile_status, country_code: strict strings.
- status, user_exp, vip_exp: unsigned32 numeric conversions.
- battle: object parsed by ParseUser G9430f8: pvid full64; rank/season_no/
  weekly_no/league_level/rating_point/league_win/win/lose unsigned32;
  refresh_datetime full64 numeric; start_message/win_message/lose_message
  strict strings.
- deck: dense OBJECT keyed inst_1,inst_2,..., not an inventory array. The
  parser counts entries and constructs these one-based keys at G9440aa
  onwards. Each entry's inst_id is full64 at G944154 onwards. Nonzero IDs
  invoke CSRPlayData.ParseCardInst and require the full independent owned-card
  grammar; zero creates an empty card which is still pushed to the vector.
- gem: separate collection parsed through CSRGem.ParseGem, requiring its
  independent complete Gem grammar for any nonempty publication.

Numeric default-to-zero conversion does not make a missing parent object or
strict string safe. No Guild field is read by this parser. Empty chain_bonus
and gem collections are structurally meaningful, but original zero earned
effects cannot be inferred merely because they would avoid extra work.

Correction to an intermediate research message: battle.refresh_datetime is
NOT a strict date string. Native integer conversion LDRD G94344c and its
eight-byte storage preserve the numeric full64 value. Numeric0 in the
existing local Arena profile is not contradicted by this parser. The three
battle message fields are the strict strings in that tail.

## Deck policy and cross-account identity boundary

CSRFC.MakeStageInst obtains the LOCAL attacking party using GetDeckInfo4
in sources/native/hunters/ghidra-arena-battle-stage-consumers.txt:378–380.
This does not establish which deck the original server selects for the
target. Neither the friendly request nor its rival parser specifies target
case4/5 or an ordinary party. A future choice of an explicitly stored owned
defense deck5 is LOCAL policy, never recovered original backend selection.
It must not silently copy another deck or grant/alter owned Hunters.

Overlapping per-account instance IDs need a separate proven strategy before
publishing a native-combat-capable friendly rival:

- The same MakeStageInst source:446–449 preserves own card instance words;
  lines813–814 copy the rival CSRCard without an observed replacement-ID step.
- sources/native/revival/ghidra-enemycamp-decomp-02.txt:1142–1157 obtains
  the analyzed card instance words and passes them to BaseDraw.Load. Fresh
  Thumb G9addb0 loads r2/r3 from card+10; G9addd8 calls that load function.
- CSRGameActorBaseDraw.Load G99a438 stores the supplied full64 serial at
  actor+880/+884, instruction G99a45e. GetSerial G99abb8 returns those words.
- Global CSRGameBase.FindActorData G9dd49c iterates group actor vectors and
  compares ONLY the full64 serial at G9dd4ee..512, returning the first match.
  That lookup has no camp identity argument or comparison.

Therefore duplicates that reach these actors create ambiguous global serial
lookup; cross-camp safety is not established by separate actor groups. No
actual native crash, damage misrouting or runtime collision was reproduced
by this offline audit, and other possible downstream remapping is not
universally excluded. Do not claim overlapping account-local IDs safe or
change/renumber private saves to bypass this boundary.

The current honest runtime behavior can remain an authenticated non-success
refusal. Full native preparation requires compatible published references,
complete real owned participants/equipment/skills/Gems, justified aggregate
effects and identity handling, then direct native scene validation. It does
not follow from a parser-shaped fixture alone.

## Follow-up: transient rival serials and the separate Gem attachment join

Bounded native review supports a response-only rival-card serial projection
as a LOCAL collision strategy. The client copies rival card instances into
actors; the actor serial lookup described above uses both ID words. Reserved
mirror serials `9_100_000_001..9_100_000_005`, selected by dense defense slot,
are exact JavaScript integers and exact native uint64 numeric JSON values.
They are separate from this server's owned-card namespace
`1 <= ID < CARD_INSTANCE_LIMIT` (`900_000_001`), fixed Search helper
`900_000_001`, and existing Arena fixture serial `9_000_001_001`.
These constants are LOCAL choices, not recovered original friendly IDs.
No save identity may be renumbered to implement this projection. Empty slots
remain `{inst_id:0}`; nonempty slots copy the actual full card DTO with only
its response `inst_id` replaced. Actual friendly-scene runtime validation is
still required before claiming the projected scene works.

Equipment levels/ranks, skill levels, skin references, and progression are
fields inside the parsed `CSRCard`; they are not independent owned-card-ID
links in the established flat card grammar. This does **not** cover Gems:
those are parsed separately and explicitly joined to cards by target ID.

`ParseDefender` G943958 reads the separate `gem` collection, calls
`CSRGem::ParseGem` for each row, and appends the returned shared row to
`BATTLE_ENEMY +0xb8` (published
`sources/native/systems/ghidra-arena-lobby-helpers.txt:1579` onward).
`CSRGem::ParseGem` Ga5c2f4 delegates to `CSRGem::parse` Ga5d3dc at
Ga5c342. This bounded wrapper returns the parsed shared row; it does not
show an insertion into the local player's owned-Gem inventory.

The complete Gem keys are recorded in
`sources/native/economy/ghidra-gem-inventory-keys.txt`: `ref_id`, `inst_id`,
`rank`, `level`, `position`, `target_inst_id`, `ability`, `abilities`, and
`level_up_failed`. Ability is its established string-JSON grammar containing
`main`/`sub`, not an invented empty object. Gem instance and target IDs are
native full64 values; rank/level/position/failure counter use uint32
conversions. The target integer-JSON branch loads both words at Ga5d5c6
and stores both at Ga5d5ee. The store is allocation `+0x58`, which is
returned `PLAY_DATA +0x48` after its `+0x10` control-block prefix.
As with existing Gem wire publication, unsafe uint64 values require exact
unquoted integer JSON tokens; native string parsing passes through double
and must not be used to preserve arbitrary full64 identities.

The rival-card attachment comparison is positively closed in
`CSRFC::MakeStageInst` G9418b0:

- `sources/native/hunters/ghidra-arena-battle-stage-consumers.txt:957`
  onward loops the rival Gem list for each copied rival card.
- G94227e loads card `+0x10/+0x14`; G942282 loads Gem
  `PLAY_DATA +0x48/+0x4c`.
- G942286..28c compares **both words**, and only an exact match appends
  that Gem to the actor's list. The matching Gem shared object is retained
  at G942298..29e; there is no compensating original-to-mirror target-ID
  mapping in this join.

Therefore changing only `card.inst_id` while publishing unchanged attached
Gems silently loses their actor association. A coherent Gem-capable mirror
must map each selected Gem's `target_inst_id` to the corresponding response
card mirror ID, preserve its other validated fields, and ensure it publishes
only the intended selected participants' attachments. The bounded work does
not establish universal safety for arbitrary overlapping Gem instance IDs
in every downstream consumer. That claim needs separate closure.

A deliberately limited first implementation may publish `gem:[]` only when
the selected real defense participants have no equipped Gems; it must refuse
an unsupported attachment rather than drop an earned effect. Likewise the
explicit stored defense-deck5 selection, same-server accepted-friend access,
zero Card Book/chain effects where that is the server's currently published
LOCAL policy, and all other reference/bonus validation remain necessary.
This is a compatibility strategy for a real read-only rival projection,
not a new ownership grant, Arena admission token, BP charge, or reward law.
