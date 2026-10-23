# One authored Mirage floor with zero rewards

`config/policies/mirage-local-zero-reward.json` provides one explicit LOCAL
three-battle floor for native Mirage validation using Hunters you already own.
It grants no Hunter, EXP, item or currency. Every stair awards zero gold.
This is an authored test scenario using original artwork and existing Hunter
references, not the recovered original Mirage assignment or balance.

**Opening the configured Mirage panel is a durable action.** Its first GetInfo
enrolls supported owned Hunter families, sets their Mirage carried HP to10000,
marks unselected duplicates−1 and captures the full three-stair recipe. It
starts with no registered party. An active attempt holds enrolled roster
mutations until completion or abandonment. Merely disabling the mode preserves
the carried HP, record and holds; it does not release the roster.

The recipe is a **single captured attempt**. After completion or abandonment,
this baseline does not create another attempt automatically. It supplies no
first aid or re-entry allowance. Changing a captured recipe is refused rather
than retuning an existing attempt. No save deletion or host-authenticated reset
is part of the intended workflow.

## Opt-in setup

Use the reviewed compatible170-package resource profile; it includes the
required original MIRAGE, LEVELING, ST002 and shared fever artwork. Keep the
current reviewed launch options, state file and paid-progression settings.
These two additional environment values select the public recipe on a deliberate
server restart; the recipe is not enabled by default:

```powershell
$env:BLUSTONE_MIRAGE_MODE = 'local-configured'
$env:BLUSTONE_MIRAGE_POLICY_JSON = Get-Content -Raw 'config/policies/mirage-local-zero-reward.json'
```

The focused check covers the compatible170 profile together with
`BLUSTONE_TEAM_LEVEL_PROFILE=local-linear-100`, the existing2021 Rupee shop
policy and its explicit daily cap3. Team level16 in the fixture comes from
authored1500 account EXP under that local curve; enabling this recipe does
not grant that EXP or bypass a native entrance gate.

An existing captured run, unexplained carried HP or incompatible references must
remain a refusal. The recipe's all-grade0/balance10000 values, Nene003/rank3/
EXP0 opponent, owned skill levels1/1/1/0/0, zero rewards/hero bonus and2038
INT32_MAX hero deadline are deliberate LOCAL choices. Blank numeric passive
data stays blank; having skill3 level1 does not invent a missing effect.

## Intended exit and validation boundary

Native confirmation starts a scene from the hydrated party/enemy cache; no
invented Begin/Start RPC is required. After a win, claim the zero-gold result
to advance the next stair. After stair3's claim, the server clears enrollment
and party and returns every owned carried HP value to the historical1000
placeholder, releasing holds without changing ordinary progression.

For an unfinished or defeated party, the source-backed exit is the Mirage
Retry/reset control: confirm the active-attempt warning, obtain the same-floor
offer, then the native equal-floor shortcut sends reset1/stay1 with full cache
sections. The baseline abandons, clears enrollment/party and releases all
owned HP/holds without re-enrollment or reward. Pending reward state2 must first
be claimed, even when gold is zero. The Retry wire clock is projected ready
for an active run; the captured enrollment timestamp is preserved internally.

This UI chain still needs native verification on this recipe, including its
warning/owner gate. Backend and source tests do not prove the control is
currently reachable or a battle is safe. No native battle or completion is
claimed by publishing the recipe. After a client crash, the durable active
cache survives restart; the same intended Retry chain remains the source-backed
release path. This recipe adds no automatic healing-on-reopen mechanism.

## Focused coexistence check

`npm run test:mirage-public-policy` builds and runs the actual compiled170-profile
integration using three disposable accounts. It performs a real dummy2021
Rupee purchase, producing schema8 and a spent Manda/daily counter; then initial
Mirage capture promotes to schema12 while retaining that counter and all
unrelated account/game fields. Reload retains the exact policy and carried HP.

The test registers genuinely owned dummy cards, supplies three explicit End
packets, verifies zero-gold Reward/cache shapes and byte-identical replays,
and proves final release returns all three baseline games exactly. Separate
paid duplicate Nene instances verify one-family enrollment and the unselected
copy's−1 sentinel without consuming or changing either Hunter. Separate
dead-party and crash-style active caches exercise GetNextFloor→reset1/stay1
abandonment. Disabled reads preserve records/holds until release; no hidden
reset or live account is used. The Rupee journal survives every capture,
reload, claim, mode change and abandonment.

Focused compiled test passed. Existing encrypted Mirage lifecycle coverage also
passed during preflight. No active8080 process, private save, native UI, source
feature, original asset or default profile was changed in this publication.
