# Native encrypted Chat frame: PV1300, ciphertext and plaintext SHA256

Original bounded source closure; no keys, private data, listener, connection,
Chat message, fuel request or AP mutation. DataDump read-only. Immutable ARM
SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G coordinates are code ELF plus10000. Original symbol identities independently
bind CPVChatRequestMessage.encrypt, SharedSecret and OnMessageBridge.

## Exact byte layout

`CPVChatRequestMessage.encrypt` G7d913c returns:

```text
offset0..3: 50 56 13 00       (hex bytes, exactly this order)
offset4..:  ciphertext       (entire native EncryptMessage returned vector)
last32:    SHA256(plaintext) (raw32 bytes, not hex/base64)
```

No length prefix, separate tag/IV/nonce, HTTP signature or account/key identifier
is added by this frame envelope. The cipher vector is opaque to framing;
do not prepend another invented IV or reinterpret the native cipher output.
Allocation is cipherLength+0x24 G7d9272..9280: header4 plus digest32.
Header stores are0x50 G7d92a2/2a4,0x56 G7d932c/32e,0x13 G7d93b4/3b6,
then0 G7d943c/43e. Reallocation branches repeat the same bytes.
Cipher insertion G7d94cc..94d4 is followed by digest insertion G7d94de..94e6,
from stack+c8 to stack+c8+20hex (32 bytes).

Receiver reads bytes2/3 as a halfword, reverses and compares the resulting
high16 value with0x1300 G8ae6a2..6ae. This establishes **13 00 byte order**,
not a speculative bitflag registry or little-endian numeric13.

## Digest is exact plaintext SHA256, not HMAC

The request obtains virtual to_json G7d9158..15e, dumps compact JSON into
a std::string G7d916e..9174 and initializes CryptoPP SHA256. Its original
mangled destructor/InitState/DigestSize symbols corroborate the unkeyed
32-byte algorithm. Update hashes that exact string's bytes G7d91ce..91ee;
Final writes stack+c8 G7d91f8..91fc. Only afterward does encryption run
G7d926e. Thus the trailer is **unkeyed SHA256 of exact UTF8 plaintext bytes**,
not HMAC-SHA384/HMAC-SHA256, ciphertext digest or header-inclusive digest.
Decode must not parse/re-stringify JSON before hashing: spacing, ordering,
numbers and escaping are part of the hashed byte sequence.

## Positive response decoder confirms the same envelope

CSRChatModule.OnMessageBridge G8ae588 verifies P/V at G8ae5ba..5cc and
encrypted1300 G8ae6a2..6ae. It computes cipherLength=frameLength−36
G8ae6d8, requires>=16 G8ae6dc/de and multiple16 G8ae6e2/e6, then passes
frame+4/exact cipherLength to SharedSecret.DecryptMessage G8ae6f6..706.
It hashes the decrypted vector (SHA256 Update G8ae76e..77e, Final
G8ae788..78c) and compares ALL32 trailer bytes beginning
frame+4+cipherLength, unrolled G8ae7de..976. Mismatch goes to an error branch.
Success swaps decrypted bytes into the received buffer G8ae97a..996 and
continues to the normal message callback. This does not approve an application
mutation or validate account ownership merely because the digest matches.

Other prefix/header branches exist. A minimal supported codec may admit ONLY
this closed encrypted1300 form and reject the others. Constant-time digest
comparison is a compatible local implementation choice; the native unrolled
comparison supplies no different digest or ownership rule.

## Shared HTTP key owner; authentication still separate

Request encrypt gets CPVHTTPSharedSecret.get G7f380c at G7d924a and calls
the SAME EncryptMessage G7f2f20 at G7d926e used for HTTP. Response decoder
gets that singleton G8ae6f6 and calls DecryptMessage G7f339c at G8ae706.
This is not a new Chat handshake/key derivation.

EncryptMessage asserts derived-key size48 G7f2f40..44. Its SetKeyWithIV uses
first32 bytes and derived pointer+32 with IV length16 G7f2f8e..fa2. Existing
cipher allocation rounds to whole16-byte blocks G7f2f6c..f76. The already
working HTTP crypto/key derivation is the future reusable seam. A pure codec
can inject encrypt/decrypt callbacks and expose no keys or account registry.

**Connection/account binding remains unclosed.** Frame contains no account or
key identifier selecting a stored server transport key. Singleton ownership
does not establish upgrade token/header, room authentication, sender identity,
key rotation or broadcaster fanout. Bind a future listener to an independently
proved authenticated session/key; do not guess from tag/command/payload.pvid.

## Body fields are separate from framing

Base to_json G7d8f28 supplies command:uint32/request+10hex/keyG7d8f60;
tag:uint64/request+8/G7d8f9a; version:string/request+18hex/G7d8ff2;
utc:signed32/request+14hex converted to JSON double/G7d902c.
Derived payload wrapper G8af6d0 calls base G8af6ea then adds `payload`
G8af6fe/702 using its virtual JSON producer. Guild logical
payload{message:string,type:innerCommand} and outer11000 are separately
documented in guild-fuel-chat-producer-native-2026-10-13.md.

This frame unit does not validate body schema, supply tags/version/times,
implement enter/auth messages or create a listener. Offline tests can verify
header/cipher/digest order, min/aligned cipher length, corruption and exact
detached plaintext with authored cipher callbacks. Socket/auth/room/schema
and fuel AP settlement remain unclaimed.

## Implemented framing codec

`src/chat-frame.ts` implements encode/decode around caller-bound encryption
callbacks, preserving exact plaintext bytes. Header/length/AES-block validation
precedes decryption; SHA256 trailer verification follows it using constant-time
comparison. Cipher/decrypted buffers are copied at callback boundaries and
results are detached. Crypto/padding/key failures propagate without fallback.

Authored tests perform a disposable real ServerState ECDH exchange, derive the
same key independently on the client side, and decrypt frames with both sides.
Plaintext{} yields16 encrypted bytes and a52-byte frame, proving no IV prefix;
its known SHA256 trailer matches. UTF8/whitespace, ciphertext/header/digest
corruption, truncated/unaligned frames, key failure and result detachment pass.
No socket, existing account, listener, message delivery or JSON schema is enabled.
