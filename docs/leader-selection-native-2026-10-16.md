# Owned leader selection: original request and scalar receipt

Immutable original ARM SHA256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded original Thumb inspection; G addresses below are ELF code+0x10000.
No original/DataDump bytes, private state, client or live UI were modified.

CSRPopUpCardDetail.SetLeader(bool) Gdd0bf8 updates the leader indicator, not
the server. Its literals include UI_CH_IF_LD, SPR_LEADER and the original
misspelling LEDAER_OFF. The real action's popup callable reads selected card
pointer+6a8 at Gdd53dc and that card's full64 instance ID+10 at Gdd53e0,
then calls CSRSyncGlobal.RequestCardLeader Gf65fa8 at Gdd53e6. The latter
owner is independently exported in DataDump native-evidence.tsv:22625.

The builder serializes target_inst_id as the full64 request argument at
Gf660d6..0dc; its key literal is Gf660e0. Its route literal at Gf661dc is
card_handler/SetLeader without a leading slash. The replica canonical route
adds the usual slash. This particular builder has four auth fields:
app_code/app_ver/pvid/otp, NOT market. They plus the target make five form
entries (Gf66104). Do not invent a SetDeck type0 operation for this feature.

ReqCardLeaderCB Gf66560 checks transport status0 and application result1 at
Gf66588..592 before parsing its body. It selects result_code then ret_data,
with integer full64 LDRD at Gf66658 and numeric conversion alternatives.
Successful ret_data is the SCALAR selected instance ID, not a nested object,
card collection, prev/cur pair or boolean. The callback refreshes cached
leader-related user data and writes the inventory leader full64 words at
Gf66798/Gf667c4. Supplying a malformed success scalar risks conversion to0;
invalid targets must receive non-success rather than a generic success mock.
The popup completion checks result1 and live popup availability at
Gdd55a6..5ac, then SetLeader(true) Gdd55b0 updates its indicator.

The request/callback does not publish item costs, rank/role requirements or
lock eligibility. src/leader-selection.ts therefore selects only an exact
existing owned identity with a published reference; it does not invent a
role/rank/lock gate or change ownership, stats, party decks or economy.
Stored local card IDs remain safe positive numeric identities, a subset of
native unsigned64; wide unknown requests cannot round into another card.
The pure plan is detached and does not mutate the supplied game.

Changed selection is refused while any ordinary, Search or Arena battle is
active as declared LOCAL participant-stability policy. The same current-ID
selection remains an idempotent no-op. This does not claim the original
mid-battle admission law or a recovered request nonce. Persistence rollback,
authentication and scalar wire emission belong to the state handler. Native
leader UI validation remains pending independently of backend proof.
