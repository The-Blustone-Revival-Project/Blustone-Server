import assert from "node:assert/strict";
import {guildWalletReceipt,type GuildWalletSnapshot} from "../src/guild-wallet-receipt.js";
const before={gold:100,iap_qty:23,free_iap_qty:31},goldAfter={...before,gold:83},copy=structuredClone({before,goldAfter});
const found= guildWalletReceipt(before,goldAfter);
assert.deepEqual(found,{gold:{prev:100,cur:83},iap:{prev:23,cur:23},free_iap:{prev:31,cur:31},iap_qty:23,free_iap_qty:31},
  "gold-only settlement must not omit and zero native Manda scalars");
const changed={gold:100,iap_qty:11,free_iap_qty:7},update=guildWalletReceipt(before,changed);
assert.equal(update.iap.cur,update.iap_qty);assert.equal(update.free_iap.cur,update.free_iap_qty);
assert.equal(update.iap.prev,23);assert.equal(update.free_iap.prev,31);
const noop=guildWalletReceipt(before,before);
assert.equal(noop.iap_qty,23);assert.equal(noop.free_iap_qty,31);
found.iap_qty=999;found.gold.cur=999;
assert.deepEqual({before,goldAfter},copy,"returned receipt cannot mutate explicit wallet snapshots");
for(const value of [-1,1.5,0x1_0000_0000,NaN,Infinity,undefined,"31"])
  assert.throws(()=>guildWalletReceipt(before,{...before,free_iap_qty:value} as GuildWalletSnapshot),/explicit uint32/);
assert.equal(guildWalletReceipt({gold:0,iap_qty:0,free_iap_qty:0},{gold:0xffffffff,iap_qty:0xffffffff,free_iap_qty:0xffffffff}).iap_qty,0xffffffff);
console.log("Guild wallet receipt: mandatory authoritative paid/free scalars, coherent optional delta objects, unchanged-Manda preservation, strict missing/width refusal and detached snapshots passed; no debit priority inferred.");
