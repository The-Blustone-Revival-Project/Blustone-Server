# Ordinary Guild Chat text and response token consumption

Original bounded native evidence. No listener, socket, message, account/save/
input/APK or DataDump changes. ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses equal code ELF plus10000. Complements the verified framing,
connection/enter and response DTO audits.

## Exact normal text producer

CSRPopUpChat's text-submit continuation **Gba94b0** inspects the supplied
std::string. Empty input returns/closes the editor; non-UTF8 fails through
CMIsUtf8 G78ddb8 at Gba94da. The native whitespace-only loop
Gba94ec..9528 skips submitting strings consisting only of the tested whitespace
characters. This does not establish a complete backend maximum length,
normalization, blacklist or throttling policy.

For the actual submitted text it copies the string Gba9580..958a, reads the
active origin Gba9592..9598, then:

- origin0: CSRChat.Chat(TYPE0,inner10002,text) Gba959c..95a8.
- **origin1/Guild: CSRChat.Chat(TYPE1,inner11000,text)** Gba95ae..95ba.

The existing module command selector separately maps TYPE1 to OUTER11000.
Thus the full supported ordinary Guild request body has outercommand11000
and payload **`{message:<actual text>,type:11000}`**. It is not command11010,
an empty creation request, a CreateFuelJson object, or an arbitrary control
command merely because its text contains JSON-looking content.

No local AddChatLog call occurs after these send calls in the complete bounded
text-submit continuation. Its remaining work destroys the temporary string
and closes the editor. Ordinary local/own text display is therefore not proved
to be an optimistic local append; echoing the authenticated author's message
back to that author is compatible with the actual receiver path below.

## Received ordinary Guild message and own/other display

CSRChat.OnGuildMessage **G8a81a8** requires callback status0 and parsed
error.code0. Accepted outer commands include11000,11010,11011,11012;
normal text can use **outer11000** and the existing received payload
**`{who:uint64,nickname:string,message:string,type:11000}`**.
The source DTO and exact full64 sender parsing are in
chat-response-entry-sinks-native-2026-10-13.md. Sender fields are filled by
the future server from authenticated connection identity, not accepted as
client-authored payload additions.

The normal path builds CHATDATA and calls **AddChatLog G8a88fc** at
G8a8334. AddChatLog first queries CPVRelation.IsBannedID G82650a at
G8a8920 and discards banned senders on result1 (G8a8924..26).
It recognizes inner11000 at **G8a8a70..76**, taking the same own/other branch
as public ordinary10002 and request11010. That branch compares both sender
words against current CPV account ID **G8a8948..95a** and writes style3 for
own sender or style4 for another sender **G8a895c..964**. No nickname-as-
identity shortcut or low32 sender comparison is used there.

It then passes the record through the Guild Chat handler at G8a8986; ordinary
11000 does not enter the11010/11011 fuel or11012 banish control branches.
Accepted records append to the native Chat log and notify observers. Native
trimming above350 prior entries is a client log behavior (G8a89b2..ba), not
proof of durable server history limits. Correct sender/text fields enable
the ordinary display path; original fanout/history/retry/reconnect behavior
remains separate.

## Response accessToken is mandatory syntax, not a proved rotation message

CPVChatResponseMessage.Parse G8a9530 unconditionally converts camel-case
**accessToken** to a strict string at G8a9548/G8a957a and stores that field
at response+30hex. Missing/null values fail; **empty string is valid syntax**.
This is separate from the connection's X-PV-AccessToken exchange credential.

Complete bounded OnGuildMessage G8a81a8..898898 and OnSocialMessage
G8a7bc0..81a8 inspect errors/commands/payload and clean up the parsed token
string. No shared-secret getter/token setter or assignment from this response
field into the crypto owner appears in those consumers. The Guild cleanup
reads the token at stack+e8 (response base+b8 plus30hex) G8a8252/G8a852e;
it is not a credential rebinding operation. Module.OnMessageBridge decrypts
using the existing shared secret BEFORE this JSON parser runs.

Therefore an explicitly LOCAL ordinary-message response can use
**`accessToken:""`** with **`error:{code:0,message:""}`** and the exact
command/tag/payload grammar; it need not manufacture or expose another
recipient's HTTP exchange token. No native consuming assignment has been
proved that requires rotation/echo through this field. This is parser-compatible
local empty-token policy, **not a captured original token value or a global
claim that the original service never rotated credentials elsewhere**.

## Narrow real-feature boundary

A future opt-in local Guild-only listener may accept existing authenticated
exchange contexts, require current joined status3/nonzero same-server Guild,
admit ONLY outer11000/payload.type11000 ordinary lossless text and fill
authoritative who/nickname. Encrypt each recipient's response with THAT
recipient's existing bound key and preserve all game/save fields. Sender
blocking, length/rate limits, lifecycle membership rechecks and ephemeral
fanout are explicit local policy; no production history/replay law is inferred.

Do not expose public TYPE0/TYPE2, enter20000, fuel creation/support11010/11,
banish11012, reward/system announcements or arbitrary payloads as normal-text
echoes. The cipher/body/session helpers are prerequisites, not authorization
to activate every original Chat command. No listener or message delivery is
activated by this source document.
