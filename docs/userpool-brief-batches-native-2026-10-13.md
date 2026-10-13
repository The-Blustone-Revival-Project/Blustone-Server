# Native brief-profile batches: UserPool sends five, service codec has no three-row cap

Independent source recovery, no code changes. The historical Server
`/relation/GetTargetUserInfo` three-profile guard was an Arena/Mail fixture
boundary, not a recovered native protocol limit. Guild member names and
invitation senders can use the ordinary UserPool batch of five without
artificially limiting Guild populations or recipient inboxes.

Immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses subtract0x10000 for ELF offsets. Bounded original Thumb
bytes and DataDump `sources/native/symbols/native-evidence.tsv` were inspected
read-only; no live save/process, input or APK changed.

## General relation request serializes the complete supplied vector

CPVRelation.RequestUserInfo **G8220c4** takes a vector<uint64> and passes
that entire vector to **CreatePVIDList G817f34** at G8220e4. The vector
begin/end are loaded at G817f5e; its construction helper G8284c8 receives
both at G817f6c and walks the supplied range. A JSON array tag2 is assigned
at G817f52/58 and dumped to a string at G817f84. There is no first-three
selection, array-size3 condition or service-level count truncation.

That text is assigned to exact form key **list** at G82224a. The route is
**/relation/GetTargetUserInfo** at G8223e4. Alongside list it sends the
normal auth/platform fields; the seven-entry map count at G8222c8 is auth6
plus list, not a requested profile count. Small-string allocation comparisons
against11 elsewhere in this function are std::string storage thresholds,
not an eleven-person batch limit.

Native request IDs are actual uint64 integer values. Current real local
account admission/serialization remains bounded by its established exact
identity registry; this recovery does not authorize rounded/unknown IDs,
another server's account, private credentials or a synthetic Hunter profile.

## Response parses every returned brief row

CPVRelation.ReqUserInfoCB **G8227f0** decodes the response, requires successful
result and selects ret_data then **list** at G8229d0/9dc. It initializes a
list< PV_TARGET_INFO > and iterates the entire selected JSON collection.
At G822a68..9c it obtains each row and calls GetTargetInfo **G822c54**;
G822aa0..ac8 appends the parsed record. G822afc..b30 advances the iterator
and loops until the collection's actual end. No three-row break or truncation
occurs in this consumer.

The list child is therefore required independently of the number of rows.
Existing Server public brief rows contain pvid, nick_name, profile_url and
other strict known scalar/string fields consumed by that parser. Real sender
names do not require constructing a detailed Hunter party or grant record.
Unknown/unsupported identities should refuse the scoped query rather than
appear as invented local profiles.

## Actual UserPool queue chunks are five profiles

CSRUserPool.RequestUserInfo **G10a2b0c** checks empty vector begin==end
at G10a2b28, then calls CPVRelation.RequestUserInfo at **G10a2bf4** with
the supplied vector. It has no three-count split. The actual upstream chunking
is **FlushQueueUser G10a2ea4**:

- G10a2eb4 initializes count to **5**.
- G10a2ec2 loads queued vector begin/end; G10a2ece divides byte difference
  by8 to obtain the number of uint64 IDs.
- G10a2ed0 compares queue length with5 and G10a2ed4 selects the smaller
  actual length.
- G10a2ed6 selects begin+count*8, G10a2ee2 copies that slice into the
  outgoing vector, and G10a2f0a calls RequestUserInfo with it.
- G10a2ee8..f02 shifts remaining queued IDs forward and updates the queue
  end. A larger queue is retained for subsequent flushes, not an inbox limit.

FlushQueueDetail G10a2f50 independently uses the same literal5 and range
construction for the detailed-profile branch. It should not be confused with
the brief response grammar.

Another potential false limit is AddQueueUser's **G10a38da compare8**.
The previous subtraction at G10a38d8 is a byte-size difference, so8 means
the FIRST single uint64 ID in the queue. The following float-time addition
G10a38de..ee schedules its flush deadline. It is not eight profiles or an
eight-person hard cap.

## Correct Server scope boundary

Real same-server mutually nonblocked account rows can be admitted in batches
beyond the old three-profile fixture guard while retaining exact response
list shape and known-identity validation. The native ordinary UserPool sends
five; the general service codec can serialize/parse a larger supplied vector.
This is not proof of an original remote server unbounded service/rate policy,
and it does not bypass the host's ordinary request-size limits.

Reserved Arena opponent/system-mail identities form a separate explicitly
authored fixture corpus. Expanding real-user batch admission must not expand
those synthetic identities, mix unsupported AI pair shapes into ordinary
queries or return an unknown profile merely because its number looks valid.
Authentication, same-server and mutual blocking rules remain enforced.

The recipient invitation inbox must not be limited to three notifications
to accommodate an obsolete profile-count guard. Its natural UserPool queue
already chunks profile requests and retains the remaining IDs. Producer
notification ownership/read/delete policy is separate from this profile codec.

This note is source/contract proof only. Native many-sender Guild Mail pixels
remain unverified while live inputs are held.
