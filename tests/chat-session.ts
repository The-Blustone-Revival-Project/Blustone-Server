import assert from "node:assert/strict";
import crypto from "node:crypto";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {encodeChatFrame,decodeChatFrame} from "../src/chat-frame.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-chat-session-"));
try {
  const file=path.join(dir,"state.json"),state=new ServerState("http://localhost",file);
  const owner=state.registerGuest({device_id:"chat-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"chat-peer"},{}).ret_data as any;
  const exchange=()=>state.exchangeSecret({publicKey:crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"})
    .publicKey.export({format:"der",type:"spki"}).toString("base64url")});
  const a=exchange(),b=exchange(),unbound=exchange();
  assert.throws(()=>state.chatCryptoFor({}),/bound transport/);
  assert.throws(()=>state.chatCryptoFor({"x-pv-accesstoken":"unknown"}),/bound transport/);
  assert.throws(()=>state.chatCryptoFor({"x-pv-accesstoken":unbound.accessToken}),/bound transport/);
  state.accountFor(owner,{"pv-accesstoken":a.accessToken});state.accountFor(peer,{"pv-accesstoken":b.accessToken});
  assert.throws(()=>state.chatCryptoFor({"pv-accesstoken":a.accessToken}),/bound transport/,"Chat uses the actual X header, not an invented generic token credential");
  const bytes=readFileSync(file),headers={"x-pv-accesstoken":a.accessToken};
  const own=state.chatCryptoFor(headers),other=state.chatCryptoFor({"x-pv-accesstoken":b.accessToken});
  assert.equal(own.pvid,owner.pvid);assert.equal(other.pvid,peer.pvid);
  assert.throws(()=>{(own as any).pvid=peer.pvid;},TypeError);
  headers["x-pv-accesstoken"]=b.accessToken;
  const plain=Buffer.from('{"command":20000,"payload":{"channel":7}}');
  const frame=encodeChatFrame(plain,own.encrypt);
  assert.deepEqual(decodeChatFrame(frame,own.decrypt),plain);
  assert.throws(()=>decodeChatFrame(frame,other.decrypt),"Another bound actor key cannot decrypt the owner's frame");
  assert.deepEqual(readFileSync(file),bytes,"Obtaining/using crypto contexts does not persist or create rooms/game state");
  // Disposable in-memory revocation probe; never modifies a real account/save.
  (state as any).accountsByPvid.delete(owner.pvid);
  assert.throws(()=>own.encrypt(plain),/no longer established/);
  assert.throws(()=>own.decrypt(frame.subarray(4,-32)),/no longer established/);
  assert.throws(()=>state.chatCryptoFor({"x-pv-accesstoken":a.accessToken}),/bound transport/);
  assert.deepEqual(readFileSync(file),bytes);
  const restarted=new ServerState("http://localhost",file);
  assert.throws(()=>restarted.chatCryptoFor({"x-pv-accesstoken":b.accessToken}),/bound transport/,"Ephemeral exchange keys are not reconstructed from saved account tokens");
  assert.deepEqual(readFileSync(file),bytes);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Chat session bridge: native X exchange header, existing bound owner only, peer key isolation, immutable contexts, revocation/restart refusal and exact save preservation passed; no socket/rooms/messages.");
