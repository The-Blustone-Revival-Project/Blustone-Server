# Guild Appoint: exact request, role picker and leader-only management path

Appoint request/receipt and the ordinary member-management hierarchy are now
source-backed. The role picker distinguishes leader1, supervisor2 and member3.
Role1 can represent a leadership transfer, but the original former leader's
new role and numeric supervisor limit remain unproved. This evidence enables
no mutation itself; an opt-in implementation must declare those choices.

## Source and exact scalar request

Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses subtract0x10000 for ELF. Writable type metadata uses
actual PT_LOAD mapping. Original symbol locator: DataDump
sources/native/symbols/native-evidence.tsv. Bounded original Thumb bytes and
the existing exported UI XML/text were inspected read-only.

CSRGuild.RequestNominate Ga77f64 takes one uint64 target, MEMBER::ROLE and a
status-only callback. It sends auth5 plus exactly:

- **target_pvid**, scalar uint64 decimal string, literal Ga780cc/Ga780ce.
- **role**, scalar decimal enum, literal Ga780f8/Ga780fa.

The route literal at Ga78274/Ga78276 resolves `/guild/Appoint`. This is not
a target list, target_pvid_list, Guild ID, existing/new leader pair or a
client-assigned member record. It sends no fee, newbie flag, contribution,
capacity or former-leader demotion role. Authentication and persisted
membership must identify the actor and its Guild independently.

## Actual response callback updates only authoritative supplied state

RequestNominate `$_25` TASK_READY E0 RTTI name ELF1df9667 links through
RTTI VA214f4d8/vtable VA214f4ac to callable ELFa7e155 / Ghidra Ga8e154.
The success branch selects ret_data at Ga8e184/Ga8e188, then independently:

- my_guild → ParseMyInfo Ga685f0 at Ga8e206.
- guilds → ParseGuilds Ga6b340 at Ga8e288.
- user → generic SyncUser Gb7047c at Ga8e346.
- achievement → existing achievement consumers.

Failed status skips success parsing. No captured-target/role fallback is
performed by this actual core callback. The separately exported SetMemberRole
Ga6a256 is not called by it, and a full executable immediate Thumb-BL scan
found no direct call to that helper. This scan does not eliminate all possible
register-indirect/external calls, but that utility is not settlement evidence
for this operation.

A successful metadata transaction should therefore return the actor's
authoritative flat my_guild and full updated Guild INFO/member rows:

```text
{result_code:1,ret_data:{my_guild:{guild_id,status,newbie,role,contribution},
                       guilds:[full updated INFO],user:null}}
```

During leadership transfer, my_guild must reflect the ACTOR's resulting role,
not the target's new leader role. The whole updated member list must include
both role changes atomically; no second leader or fabricated removed member
is represented. Other counters and unknown histories remain preserved/omitted
under the existing explicit-record model.

No original Appoint charge or reward was recovered. user:null or omission
skips wallet parsing. If a nonnull user is supplied, generic SyncUser requires
authoritative iap_qty/free_iap_qty even when no currency changes. A local
wallet-neutral rule is explicit policy, not proof of free original appointment.

## Three real role-picker choices and current target storage

CSRPopUpChangeMemberRole.Init Gb9ec5c loads GUILD/G_P_APPOINT. Its actual
BT_G_CELL0/1/2 labels resolve respectively to original leader/supervisor/member
text keys at Gb9ed4e/Gb9ee2e/Gb9ef06. OnButtonClick maps those three buttons
to SetRole with1 at Gb9f6a4,2 at Gb9f6ca and3 at Gb9f6f0.
There is no offered newcomer4 picker row; no API role default is inferred from
the existence of the role4 enum elsewhere.

SetData Gb9fd3c stores both target ID words at popup+b8, then forwards its
role argument to SetRole. SetRole stores the supplied value at popup+c0 at
Gb9f7c4. Confirm BT_CH_MAN requires a nonzero chosen role at Gb9f718–1c
before invoking the popup callback. These storage facts alone do not assign
a formerly appointed leader's new role or establish every valid API enum.

### Ordinary UI callback narrows target IDs to32 bits

A full executable immediate Thumb-BL scan found the direct RequestNominate
caller at Gfcccd6. Its callback body Gfccc80 receives the selected target
pointer and role pointer; Gfccc9c loads ONLY the target's low32word. It sets
the outgoing high word0 at Gfcccd0 before RequestNominate at Gfcccd6.

Thus the general requester can serialize uint64, but this ordinary role-picker
producer can alias a member PVID above uint32. Supported local role operations
should refuse unsupported wide identities rather than silently truncate or
claim complete native UI support. Current account-domain and exact-ID checks
must still resolve the actual owned same-Guild member; request width alone
is not proof of producer fidelity.

## Member-management hierarchy positively binds leader-only Appoint

CSRTabGuildMemberMgr.OnTableViewButtonClick Gfc5b48 selects a menu template
after checking the clicked member and authenticated native personal data:

- Gfc5b9c compares target role1 and exits the row-action path for a leader.
- Gfc5ba6–Gfc5bb4 compares current pvid to target; self chooses menu1.
- For actor supervisor2, Gfc5bbe–Gfc5bd6 chooses menu2 only when target role
  is numerically greater (ordinary member3/newcomer4); peer supervisor2 or
  leader1 is not offered privileged action.
- The supported leader1 management context chooses menu3 at Gfc5bd8.

The template-name format is exact PA_TOGGLE_%sBT at Gfc5be8/Gfc5bf0.
Original UI_XML_RO **KO/GUILD/G_C_MEMBER** independently binds:

- PA_TOGGLE_1BT: user details only.
- PA_TOGGLE_2BT: user details and Banish.
- PA_TOGGLE_3BT: user details, Banish and Appoint.

Therefore only leader1 receives Appoint in the supported management scope;
supervisor2 can Banish subordinate3/4 but cannot appoint, banish a peer/leader
or use a self-action menu. Out-of-domain actor-role fallback behavior is not
permission for unsupported role0/3/4 to invoke manager actions directly.

Original localized privilege descriptions corroborate this distinction:
leader includes Change Member Role(Appoint); supervisor description includes
accepting join requests/expelling/inviting but omits Appoint. The descriptions
are real client text, not captured backend authorization.

## Transfer, supervisor cap and newcomer consistency limits

Choosing role1 for another eligible member is distinguishable from ordinary
supervisor2 appointment or member3 demotion. The native request does not tell
the server what role to assign the former leader. No bounded inspected caller
or callback supplies that demotion default, and the role descriptions list
authority without closing a backend transfer/succession policy. Require an
explicit local formerLeaderRole choice instead of claiming2 or3 is original.

The original error index contains PV_ERR_GUILD_VICE_SYSOP_LIMIT_EXCEEDED,
corroborating a supervisor-limit rejection vocabulary. No numeric limit was
recovered in this unit. A configured maxSupervisors0..39 would be local policy
within the already supported40-member/one-leader model, not recovered original
count or level-dependent quota. Validate the resulting complete member set
atomically; no silent demotion to bypass the configured cap.

Native ParseMyInfo and ParseMember force newbie1 nonleaders to effective
newcomer4. Preserving all existing newbie flags means a role2/3 change on
a newbie1 target is incoherent and should refuse. Leader1 is the native
exception, but transferring FROM a leader carrying newbie1 would also make
its configured former-leader role2/3 incoherent; refuse rather than clearing
newbie by guess. Original newcomer expiry/clearing policy remains unproved.
Preserve contribution, FC snapshots, membership, ranking and GvG counters.

A state-derived no-op receipt that echoes an already achieved target role can
be a separately declared local retry repair, including after the old leader
lost authority. It must remain read-only and must not permit a former/nonleader
actor to make a NEW role change. Original nonce/retry policy was not recovered.
No automatic succession on Leave/Banish or leader dissolution is implied.

## Handoff boundary

The exact codec and complete cache receipt are actionable. An explicit local
leader-only mode can preserve one leader and independently configured former
leader role/supervisor cap while refusing wrong-Guild/self/newbie/width conflicts.
These server admission/retry choices stay labelled local. Original quotas,
cooldowns, costs, role-grant history and transfer policy remain unknown.
Only this evidence note was written; no state/routes, live inputs, profile,
save, APK or DataDump content changed. `git diff --check` passed.
