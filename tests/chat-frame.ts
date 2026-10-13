import assert from "node:assert/strict";
import crypto from "node:crypto";
import {encodeChatFrame,decodeChatFrame} from "../src/chat-frame.js";
import {ServerState} from "../src/state.js";
// Disposable shared-secret exchange, not a live account, connection or message.
const state=new ServerState("http://localhost");
const client=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
const publicKey=client.publicKey.export({format:"der",type:"spki"}).toString("base64url");
const exchange=state.exchangeSecret({publicKey});
const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:client.privateKey,
  publicKey:crypto.createPublicKey({key:exchange.body,format:"der",type:"spki"})})).digest();
const encrypt=(data:Buffer)=>state.encryptSecureBody(exchange.accessToken,data).body;
const decrypt=(data:Buffer)=>state.decryptSecureBody(exchange.accessToken,data);
const clientDecrypt=(data:Buffer)=>{
  const aes=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32,48));
  return Buffer.concat([aes.update(data),aes.final()]);
};
const plain=Buffer.from("{}"),original=Buffer.from(plain),frame=encodeChatFrame(plain,encrypt);
assert.deepEqual(frame.subarray(0,4),Buffer.from([0x50,0x56,0x13,0x00]));
assert.equal(frame.length,52,"Two plaintext bytes pad to16 ciphertext bytes, with no IV prefix");
assert.equal(frame.subarray(-32).toString("hex"),"44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
assert.deepEqual(decodeChatFrame(frame,clientDecrypt),plain);
assert.deepEqual(decodeChatFrame(frame,decrypt),plain);assert.deepEqual(plain,original);
const exact=Buffer.from('{ "message": "길드 🧭", "type": 11010 }');
assert.deepEqual(decodeChatFrame(encodeChatFrame(exact,encrypt),clientDecrypt),exact,"Exact whitespace/UTF8 digest retained");
for(const index of [0,2,4,frame.length-1]) {
  const bad=Buffer.from(frame);bad[index]^=1;
  assert.throws(()=>decodeChatFrame(bad,decrypt));
}
for(const bad of [frame.subarray(1),frame.subarray(0,-1),Buffer.concat([frame,Buffer.from([0])]),Buffer.alloc(36)])
  assert.throws(()=>decodeChatFrame(bad,decrypt));
assert.throws(()=>decodeChatFrame(frame,()=>Buffer.from("different plaintext")),/digest/);
assert.throws(()=>decodeChatFrame(frame,()=>{throw new Error("unknown authenticated key");}),/authenticated key/);
assert.throws(()=>encodeChatFrame(plain,()=>Buffer.alloc(15)),/AES blocks/);
const decoded=decodeChatFrame(frame,decrypt);decoded[0]=0;
assert.deepEqual(decodeChatFrame(frame,decrypt),plain);
console.log("Native encrypted Chat frame: PV1300, shared HTTP key/IV exchange, AES blocks without IV prefix, known plaintext SHA256 trailer, exact UTF8 bytes, tamper/length/key rejection and detached results passed; no listener or messages sent.");
