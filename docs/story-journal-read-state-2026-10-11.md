# Story journal: exact local read marker and remaining catalogue join

Bounded read-only original native audit, 2026-10-11. No Ghidra, UI/ADB, live
save, API/state/bootstrap/package edit, client rebuild or DataDump write.

## New recovered read-state semantics

**CSRUserDB.ReadStory G109b08c** concatenates the opaque account namespace
string at **UserDB+0x20** with exact literal **/ReadDialog** (G109b0ac;
ELF literal108b128 + PC108b0ac+4 →1d83f98). It constructs **to_string(1)**
at G109b0b4/G109b0b6 and calls **CGMLevelDB.Put(group,key,value)** at
**G109b0c2**, with the supplied movie-resource string as key. The method
returns the Put result; merely observing entry does not prove persistence.

**IsReadStory G109b12c** builds the identical namespace using the same literal
at G109b14e, then calls **CGMLevelDB.Get<unsigned char>** at **G109b15a**
with the same supplied resource key. The logical record is therefore:

```text
group: <qualified native UserDB+20 owner namespace> + "/ReadDialog"
key:   exact movie_res string
value: "1" supplied to Put / nonzero byte consumed by IsReadStory
```

This slash-prefixed string is a **local database group suffix**, not an HTTP
endpoint. No new /ReadDialog or /world/ReadStory transport should be invented.
Physical LevelDB key joining/value encoding is not closed by this logical
Put/Get boundary. Do not assume raw on-disk bytes equal this plaintext triple.

UserDB.SetPVID G109853c first stringifies its uint64 PVID, appends a stringified
CPVDataMgr integer at+0xb8, then stores that result at UserDB+0x20. The appended
integer's meaning is unproved here; do not guess that it is serverId/market or
rebuild the namespace from a host PVID alone. Observe the qualified native
scope rather than borrowing another account's read flags.

## A read mark is not full story completion

Archive **MakeStoryCell Gfefc40** calls IsReadStory with **INFO.movie_res at
+0x24**, at Gff0032/Gff0036, and shows its NEW indicator only when the result
is zero. It does not use reference row id, Hunter id or Episode graph id as the
read key.

The original archive click handler copies the same movie_res into a callback
passed to **CSRUIModalHandler.PushDlg G10860b4**. A direct-call scan finds the
ReadStory call in that callback at **Gff0f18**, entryGff0eea. It weak-locks the
captured NEW indicator; if it remains visible (hidden-byte+0x270 is0), it hides
the indicator and calls ReadStory with the captured string at callback+0xc.

PushDlg places its supplied callback in the popup's **event pool at+0x74**
(queue anchor+0x84), G1086176..G10861c4. **CSRScene.Deactivate Gdf4c7a** calls
exactly that event pool at Gdf4c8a/Gdf4c8c. Thus the recovered read mark is a
**popup-deactivation acknowledgement**. This boundary does not establish that
every dialogue line was watched, that Skip cannot trigger it, or that a stage
was cleared. Never translate it into Episode/story-clear or reward entitlement.
Read flags already have a native local persistence path; a server flag is not
the missing implementation here.

## Catalogue remains the actual blocker

Original dialogue bodies and some generic script titles exist, but no authentic
GetDialog catalogue row was recovered by this bounded pass. The exact missing
join is a full original **GetDialog.ret_data[]** row:

```text
id,res_prefix,title,desc,movie_res,thumb_res,serial,type_param,type,playtime
```

This must link an actual script to its intended reference identity and native
ownership/rank/bundle/scenario gate. Existing native gate reports show type4
seen-card, type5 owned-rank threshold, type6 bundle requirements, type8 scenario
stage achievement and type9 nonempty-parameter admission. Type1 is not an
unconditional archive category; substituting type9 would bypass unknown gates.
An Episode read/clear log or a DI script filename cannot fill those fields.

Keep the current bare empty GetDialog array. Do not convert all original DI/CM
or Episode scripts into journal entries, invent playback lengths/thumbnail
bindings, or write synthetic local read records to make an empty catalogue
appear restored. The next useful evidence is an authentic metadata row, plus
an independently observed owner-qualified IsReadStory result after a genuine
eligible replay. Such observation should be labeled read acknowledgement,
separate from completion/entitlement.

Raw bounded evidence: `story-journal-read-native-2026-10-11.txt`. Source original
ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
listing addresses are ELF, G addresses add0x10000. Existing DataDump
story-journal-gate-contract.md and story-journal-original-coverage.md supply the
catalogue/gate history. No new row or server persistence helper is published
because neither a genuine row nor a missing HTTP read-state seam was proved.
