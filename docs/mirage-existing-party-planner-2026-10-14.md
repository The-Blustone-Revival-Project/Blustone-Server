# Mirage existing-party registration codec and character-family admission

Continuation2026-10-17: these codecs now support the optional configured local
run described in [Mirage local run](mirage-local-run-2026-10-17.md). Historical
statements below about absent runtime integration are superseded for that
explicit mode; original assignment/economy and native scene validation remain
incomplete.

The exact registration codec now decodes inst_list JSON STRING with full64
unsigned decimal numeric tokens, and emits the successful bare numeric ID
array. Quoted IDs, floats/exponents, negative zero, unsafe already-rounded
numbers, malformed rows and more than five slots refuse under strict local
admission. Unsafe numeric tokens are branded before Number rounding, so actual
quoted strings cannot masquerade as captured native integers. Zero slots are
omitted and remaining order preserved by the existing-cache party planner.

planMirageRegisterDeck operates on an explicitly supplied complete existing
cache and separately established owner commitments, resources, hero data and
enemy projection. It changes only inst_base.deck and validates the proposed
party through the existing local readiness check. No runtime route is enabled,
no journal initialized, and no HP/state/floor/stair/enemy/reward created. This
is the registration unit toward a complete persistent Mirage run, not a native
registration milestone or a substitute for an entry producer.

Correction2026-10-17: readiness requires exact native **base.char_id**
character families, not display names. Shared allocation+0x0c is the returned
CSRCardInfo pointer, so the compared object+0x30 field is char_id; name is
object+0x24. Different refs in one family refuse, while equal display names
in different families are admitted. Missing/empty/invalid UTF8 families refuse
under local readiness; comparisons remain exact and case-sensitive, without
Unicode normalization. The independent distinct-ref check remains additional
LOCAL policy. Dead, unowned or unrepresented participants refuse; declared
commitments must exactly match supplied entries. See
[the pointer-owner correction](mirage-character-family-owner-correction-2026-10-17.md).
Registration never upgrades the historical1000 placeholder to full10000 HP.

Source registration can treat result10189 as an accepted reply as well as1,
but only parses the bare array if ret_data exists. It does not set entry HP,
state/floor/stair or quest/wallet caches. A future persistent handler needs
captured run identity, party authorization and atomic durability, with lost-reply
reconciliation through correctly represented current party data. No original
nonce, battle-start request or strongest-copy enrollment law is invented here.

The original MIRAGE.jet remains byte-pinned at SHA256
d2cf0adca895de1174f35f507cf5e38a21b8e74572a5c895c50ad6c062f4374e.
Bounded decoded image/header probes and36 known native MIRAGE strings did not
positively establish stair/game resource names. Standard CRC variants were
heuristic probes, not proof of the native resource-key algorithm or names.
Opaque metadata words and pack presence cannot be promoted into a resource
registry. Further resource-name recovery needs the actual storage/loader mapping
or an authentic original cache/source. No guessed names are published.

Source Reward advances cached cur_stair/state/enemies inline and its dialog
close refreshes the selector. A GetInfo round trip cannot be assumed. Persistent
End/Reward must therefore emit coherent next-cache components and defend retries
from rewinding later progress or reapplying item deltas. Current original
catalogue, enrollment, advance/reward/reset/revive rules and native validation
remain incomplete. See mirage-register-deck-native-2026-10-14.md and
mirage-reward-cache-transition-native-2026-10-14.md.

Authored offline tests verify exact IDs/wire grammar, living five-slot owned
parties, family/ref and independent-name variants, current cache/context detachment and preservation
of all HP, base/enemy/stair/hero fields. No private/live state, profile or APK
change; DataDump/originals read-only. Existing API remains guarded read-only.
