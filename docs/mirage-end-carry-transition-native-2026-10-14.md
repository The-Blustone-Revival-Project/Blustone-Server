# Mirage End: exact wire, ten-thousand HP units and callback boundaries

Continuation2026-10-17: these codecs now support the optional configured local
run described in [Mirage local run](mirage-local-run-2026-10-17.md). Historical
statements below about absent runtime integration are superseded for that
explicit mode; original assignment/economy and native scene validation remain
incomplete.

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code addresses ELF+0x10000. Preserved mirage-strings-08/entry-model/
decomp-08/nextfloor exports read first, then bounded direct original Thumb,
literal floats and concrete callback vtables. Server documentation only: no
live inputs, run, HP migration, client/APK or original/DataDump mutation.

## RequestEnd is floor/stair and serialized HP collections, not guessed Begin

CSRExploreMirageInfo.RequestEnd G92ed08 takes signed32 floor and stair,
a list<pair<uint64,uint32>> player HP rows, a vector<uint32> enemy HP values,
and callback(request,response,byte). It serializes auth5 plus exactly:

```text
floor: <decimal int32 string>
stair: <decimal int32 string>
remain_deck_hp: <JSON STRING encoding [{inst_id:UINT64,hp_percent:UINT32},...]>
remain_enemy_hp: <JSON STRING encoding [UINT32,...]>
```

Player row keys resolve G92ed5a inst_id and G92eda4 hp_percent. ID copies
both words G92ed68..90; HP copies the uint32 word and zero highword
G92eda0..edc8. Rows preserve the supplied list order. Enemy values are
serialized as unsigned numbers G92ee1e..24. The JSON collections are dumped
to form strings at the remain_deck_hp/remain_enemy_hp assignments
G92eff8/G92f02a; floor/stair decimal conversion G92ef98/G92efc0.
Exact route literal G92f194 is /mirage/End. No explicit win/clear, battle ID,
run nonce, selected reward or new-floor number is sent.

OnFinish G927260 supplies floor and stair from current Mirage base+40/+44
G92751e/G927528, player and enemy HP containers, then calls RequestEnd
G92754c. Neither argument is proof of original server enrollment; future
server admission must bind the existing owned run/floor/stair independently.

## Definitive HP scale: full health is10000, not1000

OnFinish loads float32 **10000.0** at G92729e from literal G9275ec. For
winning player actors it reads actual HP/HPMax through actor getters
G99abd6/G99abea, computes float32 ratio G9274d6, multiplies10000
G9274da and converts to uint32 with native VCVT G9274de. Losing outcome
forces player HP values0 G9274e8. Enemy win outcome forces0
G927404..40a; on loss it computes the same ratio*10000 at
G927440..448. Unmatched enemy actor references also append0.

The carry consumer corroborates the unit: MakeStageInst G925798 loads
float32 **10000.0** at G9258c4 from literal G925ad0, reads owned
CSRCard.mirage_remain_hp+2c G925a68, converts SIGNED32 to float
G925a6c and DIVIDES10000 G925a70, storing the resulting battle ratio.
Thus raw10000 corresponds to1.0, raw1000 to0.1 in this battle consumer.
The existing replica card default1000 remains an explicitly LOCAL historical
convention; this audit neither changes live owned cards nor authorizes an
automatic migration. Reset/unentered−1 semantics are independently documented
in mirage-entry-cache-preservation-native-2026-10-13.md.

No clamp to0..10000 is present in these inspected output operations; supported
normal-health bounds would be local admission. Very small positive HP can
truncate to0. End has no explicit outcome field, so all-zero vectors do not
by themselves prove a uniquely distinguishable original server win/loss law.
The captured native outcome controls which side is forced0, but that byte is
not added to the HTTP form. Do not invent an authoritative outcome from a
rounded vector without stating the local producer rule.

## Parse_End parents, widths and limited mutations

Parse_End G92c64c receives the selected ret_data object:

```text
ret_data: {
  state: UINT32,
  deck: [{inst_id:UINT64,remain_hp_percent:INT32},...],
  dailyquest_min_stage: STRING,
  daily_quest: <compatible quest overlays>,
  linear_quest: <compatible linear slot data>
}
```

state resolves G92c66a, unsigned conversion G92c6ac and store Mirage
base+8 G92c6b6. Player reply HP key is **remain_hp_percent**, whereas
the request key is hp_percent and entry key is mirage_remain_hp. Reply
inst_id reads both words G92c77c; HP uses signed conversion G92c7ec.
SetCardMirageRemainHP Gaea4de is called G92c81e with the full64 ID and
the raw signed HP word. This differs from Parse_Entry's narrowed32 ID update.

The deck loop updates ONLY supplied owned IDs. It neither resets all roster
HP nor calls ParseDeckInfo, and an empty deck collection changes no Hunter
HP. The state field still writes independently; missing state converts0.
No floor/stair increment, new enemy, reward or wallet settlement occurs in
this complete Parse_End body. Do not equate its deck HP rows with a registered
party replacement. Malformed/missing top-level data is not a preserving echo.

## Critical callback: non-success does not guard its data parser

The RequestEnd $_4 inner callable is G936644, vtable VA2147438 and RTTI
VA214745c. It reads GetResultCode G93666a; success branches to G93679c.
Non-success runs VertifyResultCode and request retry-count logic
G936674..688, possibly schedules a retry, then ALSO reaches G93679c.
There is no result1 guard around the following payload mutation branch.

It tests whether the response contains the ret_data KEY using native iterator
comparison G9367ce..6816. Presence causes captured enemy HP words to be
written back into the existing cached enemy nodes G936818..6832, then
selects ret_data G936838, calls Parse_End G936844, and unconditionally
calls CSRAchieve.ParseLobbyEnter on the same subtree G93684e.
Consequently the quest minimum-stage string is required in a preserving End
data response too. Missing it can fail strict string conversion even when
the application code is non-success. ret_data:null is still a present key;
do not infer that it bypasses the branch.

Finally it invokes its caller with byte1 G936856..6866. A safe unavailable
End response must omit ret_data entirely, or carry a complete admitted
preserving subtree; generic failure2001 with ret_data:{error:...} is not
proved cache-safe and can write Mirage state0 before failing quest parsing.
This shape finding does not authorize a successful transaction or changing
live state. Account/transport failure must respect this parser distinction.

## Caller result handling and stair/floor limits

OnFinish binds its result continuation to vtable VA214716c, callable
G928744. It first checks callback byte, then independently checks the actual
HTTP GetResultCode G92876c..772. Non1 goes through its error UI branch
G928882..88c6; callback byte1 alone does not prove a victory receipt.
On result1 it uses the CAPTURED engine outcome byte G92877e..782;
loss follows the distinct branch G9288d8..88e6.

The winning branch compares current base stair+44 against stair-cache word+20
G928798..87ae, with a separately configured dialogue/cache condition afterward.
This establishes a client result-presentation choice, not a producer law
that floor increases by1 or all enemy waves/rewards are complete. Parse_End
itself does not advance floor/stair.

RequestNextFloor is a separate auth-only action; preserved direct caller
evidence shows popup OnButtonClick Gbfa5d0 invokes it at Gbfadde. A complete
floor snapshot/response and its admission are separate from End's state/HP
contract. No original stair graph, enemies, event state meanings, required
rewards or server advance policy is invented from the button name here.

The available unit is exact offline End request/reply/HP codecs plus a
shape-aware preserving refusal. Persistent Mirage still requires separately
admitted run/party/floor/stair/enemy ownership, original or explicit local
outcome/advance rules, complete cached snapshots and reward/refresh policy.
No guessed /mirage/Begin or new Mirage battle follows from this audit.
