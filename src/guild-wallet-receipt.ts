/** RequestBuild/RequestModify optional user subtrees call generic SyncUser.
 * Its paid/free scalar quantities are UNCONDITIONAL and missing values become
 * zero. Always echo both authoritative quantities even when only gold changes.
 * This helper serializes explicit snapshots; it performs no spending or grants. */
export interface GuildWalletSnapshot {gold:number;iap_qty:number;free_iap_qty:number}
export function guildWalletReceipt(before:GuildWalletSnapshot,after:GuildWalletSnapshot) {
  for(const snapshot of [before,after]) {
    if(!snapshot||typeof snapshot!=="object") throw new TypeError("Guild receipt needs wallet snapshots");
    for(const key of ["gold","iap_qty","free_iap_qty"] as const)
      if(!Number.isInteger(snapshot[key])||snapshot[key]<0||snapshot[key]>0xffff_ffff)
        throw new TypeError(`Guild receipt ${key} must be explicit uint32`);
  }
  return {gold:{prev:before.gold,cur:after.gold},iap:{prev:before.iap_qty,cur:after.iap_qty},
    free_iap:{prev:before.free_iap_qty,cur:after.free_iap_qty},
    iap_qty:after.iap_qty,free_iap_qty:after.free_iap_qty};
}
