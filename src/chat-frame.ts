import {createHash,timingSafeEqual} from "node:crypto";

const header=Buffer.from([0x50,0x56,0x13,0x00]);
function bytes(raw:unknown,label:string):asserts raw is Buffer {
  if(!Buffer.isBuffer(raw)) throw new TypeError(`Chat ${label} must be bytes`);
}
function ciphertext(raw:unknown):asserts raw is Buffer {
  bytes(raw,"ciphertext");
  if(raw.length<16 || raw.length%16!==0) throw new TypeError("Chat ciphertext must contain complete AES blocks");
}
/** CPVChatRequestMessage.encrypt G7d913c and OnMessageBridge G8ae588:
 * PV/0x1300 header, raw shared-secret AES ciphertext, SHA256(PLAINTEXT) trailer.
 * EncryptMessage uses the existing HTTP derived key/IV; no IV prefix, HTTP
 * signature, account ID or separate handshake is invented by this framing.
 * Caller must bind crypto to the authenticated connection. No listener here. */
export function encodeChatFrame(plaintext:Buffer,encrypt:(bytes:Buffer)=>Buffer):Buffer {
  bytes(plaintext,"plaintext");
  const data=Buffer.from(plaintext),digest=createHash("sha256").update(data).digest();
  const encrypted=encrypt(Buffer.from(data));ciphertext(encrypted);
  return Buffer.concat([header,encrypted,digest]);
}
/** Validate/decrypt one binary payload, not WebSocket framing or a Chat DTO.
 * Digest covers exact decrypted bytes, not ciphertext/header/JSON reserialization.
 * AES/padding/key failures propagate; no mutation or plaintext fallback. */
export function decodeChatFrame(frame:Buffer,decrypt:(bytes:Buffer)=>Buffer):Buffer {
  bytes(frame,"frame");
  if(frame.length<52 || !frame.subarray(0,4).equals(header)) throw new TypeError("Unsupported Chat frame header/length");
  const encrypted=frame.subarray(4,-32);ciphertext(encrypted);
  const data=decrypt(Buffer.from(encrypted));bytes(data,"decrypted plaintext");
  const digest=createHash("sha256").update(data).digest();
  if(!timingSafeEqual(digest,frame.subarray(-32))) throw new TypeError("Chat plaintext digest mismatch");
  return Buffer.from(data);
}
