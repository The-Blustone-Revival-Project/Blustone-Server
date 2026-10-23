# Mail read, archive and deletion: durable acknowledgements

The existing local Mail workflow now restores its in-memory state when saving
fails. Read and Archive previously changed a row flag before persistence;
RemoveReceived replaced the received list and appended deletion tombstones
before persistence. A failed temporary write or rename could therefore leave
the live mailbox ahead of the saved file even though no success was returned.

Read/Archive failure now restores the prior zero flag on the same row object.
Deletion failure restores the exact previous received array and truncates the
same tombstone array to its previous length. Existing rows, tombstones, mailbox,
game object and unrelated account state retain their identities and contents.
There is no reward, wallet, item or resource-clock mutation in these operations.

Success uses the existing unread_count and target_list receipt. Known Read or
Archive repeats and already deleted-ID repeats need no further write; deletion
tombstones survive restart. Mixed deletion batches containing old tombstones
and fresh owned IDs still settle together, deduplicate in request order, and
refuse the entire request if any ID is unknown. Paging, sender display, the
single earned local victory notice and its no-attachment policy are unchanged.

## Native contract and attachment boundary

`mail-native-callbacks-and-atomicity-2026-10-23.md` pins the original producers,
callbacks, envelope and identity widths. Supported list/read/archive/remove
callbacks do not use generic SyncUser or mutate wallets/inventory. No Manda
scalar or Supply-specific receipt was added.

The native game wrapper can mark a row read optimistically before its HTTP
response. Server rollback does not prove that this hot client flag is rewound
after a failed read; that UI/cache behavior still needs native validation.

Taking an attachment is a separate native request using message_id:uint64.
Its CPVMsg callback passes through content_result and has optional nonzero-only
absolute Manda fields; that is not an established game-specific item/AP reward
consumer. Attachment data, ownership and UI/app settlement remain unclosed.
This patch enables no attachment claim or outbound messaging, and creates no
new mail source or attachment payload.

## Verification

The state test covers three disposable accounts, real temporary-write and
rename failures for Read, Archive, single deletion and mixed old/fresh deletion,
exact nested references and saved bytes, peers, invalid/unknown targets,
no-write repeats and cold restart. AP/BP anchors and balances remain exact.

The signed P384/AES HTTP test earns the existing local notice through an
accepted disposable mission model completion. It then verifies real HTTP500
storage failures, no success receipt on failure, unchanged nested references,
retry acknowledgements, archive/unread behavior, deletion replay with a blocked
temporary path and cold tombstones. Additional authored local rows exercise the
mixed batch; these are test inputs, not an extra production mail delivery path.
The owned no-attachment notice refuses the actual native message_id request.
No native battle, claim or Mail screen interaction is asserted by these tests.

```text
npm run test:mail-atomic
npm test
```

Build, focused state/encrypted HTTP tests and the existing Mail test pass.
Full suite status is recorded in AGENTS.md and
`local/mail-atomic-full-tests-20261023.log`; focused log is
`local/mail-atomic-focused-20261023.log`. No save schema changes are needed.
The live process was not restarted and no actual mailbox/save/profile/client,
original/DataDump file, physical phone or instrumented APK was changed.

Full `npm test` passed254 programs (252 existing plus two new). Independent
read-only integration review found no concrete issue in the rollback changes.
