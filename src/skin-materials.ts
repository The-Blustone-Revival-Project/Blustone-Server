/** Original default-skin identity construction and costume art availability.
 * Paid costume reference IDs, prices, ownership and bonuses remain unknown.
 * No wire references/instances, purchases or equipment changes are generated.
 */
/** Native construction follows CardInfo reference IDs, never owned-instance
 * IDs or costume filenames. This describes an identity; it grants no skin. */
export function starterDefaultSkinIdentity(cardRefId: string) {
  const material = STARTER_SKIN_MATERIALS.find(row => row.defaultBody && row.cardFamilyHint === cardRefId);
  if (!material) throw new Error("Unknown starter CardInfo reference identity");
  return { skinRefId: material.skinRefId!, targetCardRefId: cardRefId, resPrefix: material.resPrefix,
    identityClass: "NATIVE_GENERATED_DEFAULT", serverReferencePublished: false, serverInstancePublished: false };
}

/** Naming family is only an art locator. A/B/C suffixes never become purchased
 * skin IDs, original display names, prices, ownership or bonus records. */
export function starterSkinAvailability(selectedPackageNames: readonly string[]) {
  const selected = new Set(selectedPackageNames);
  return STARTER_SKIN_MATERIALS.map(row => ({
    cardFamilyHint: row.cardFamilyHint, resPrefix: row.resPrefix, defaultBody: row.defaultBody,
    skinRefId: row.skinRefId, identityClass: row.identityClass,
    packs: structuredClone([...row.packs]),
    missingPackages: row.packs.filter(pack => !selected.has(pack.name)).map(pack => pack.name),
    artSelected: row.packs.every(pack => selected.has(pack.name)),
    paidCostumeIdentity: "UNKNOWN", purchasePrice: "UNKNOWN", collectionBonus: "UNKNOWN",
    nativeBoutiqueRendering: "PENDING", ownedByAccount: "UNPROVED", wearableGrant: false,
  }));
}

/** Strict local source-ingestion policy; native stores a64-bit signed ID and
 * boolean flags. References must have been separately recovered/approved.
 * Parsing never creates default or paid ownership, nor updates a Hunter. */
export function ingestOwnedSkinInstances(raw: unknown, approvedReferenceIds: ReadonlySet<string>) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray((raw as {skin?: unknown}).skin))
    throw new TypeError("Owned skin payload must contain a skin array");
  const seen = new Set<number>();
  return ((raw as {skin: unknown[]}).skin).map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new TypeError("Malformed owned skin row");
    const row = entry as Record<string, unknown>;
    const id = row.inst_id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0 || seen.has(id))
      throw new TypeError("Malformed or duplicate owned skin instance identity");
    if (typeof row.ref_id !== "string" || !approvedReferenceIds.has(row.ref_id))
      throw new Error("Unknown original owned skin reference");
    if (![0, 1].includes(row.is_seen as number) || ![0, 1].includes(row.is_equiped as number))
      throw new TypeError("Malformed native skin flags");
    seen.add(id);
    return { inst_id: id, ref_id: row.ref_id, is_seen: row.is_seen as number, is_equiped: row.is_equiped as number };
  });
}
export const SKIN_NATIVE_EVIDENCE = {
  librarySha256: "c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec",
  referenceCallback: {elf:"f75070",path:"/reference/GetSkinRef",innerFields:["skin","bonus"]},
  instanceCallback: {elf:"ad62ac",path:"/lobby/GetSkinInst",innerFields:["skin"]},
  referenceParser: {elf:"f16a8c",fields:["ref_id","target_card","res_prefix","title","desc","victory","regdate","order","dialog_list","price"]},
  priceFields:["value","begin_utc","end_utc","type"],
  instanceParser: {elf:"f17364",fields:["inst_id","ref_id","is_seen","is_equiped"]},
  defaultReference: {elf:"f19338",prefix:"Default_",prefixAssign:"f19436",cardIdAppend:"f19456",resourcePrefixCopy:"f194ce"},
  defaultInstance: {elf:"f19d70",ownedCardList:"f19daa",addDefaultSkin:"f19e00"},
  putOn:{elf:"f1bb30",path:"/skin/PutOn",fields:["target_card_ref","inst_id"]},
  putOff:{elf:"f1abf0",path:"/skin/PutOn",fields:["target_card_ref","inst_id"]},
  buy:{elf:"f1ca78",path:"/skin/Buy",fields:["ref_id","type","value"]},
  seen:{elf:"f19eb8",path:"/skin/Seen",fields:["inst_id"]},
} as const;
export const STARTER_SKIN_MATERIALS = [
  {"cardFamilyHint":"001","resPrefix":"C001","defaultBody":true,"skinRefId":"Default_001","identityClass":"NATIVE_GENERATED_DEFAULT","packs":[{"name":"C001.jet","bytes":1054905,"sha256":"354b7ed832a450292caf9b127c004f5a759ea64c95ed87590917a2bd009a686a"},{"name":"C001_Q.jet","bytes":50808,"sha256":"35dd21bbe416a32058935ffa6d8e1cbbafd883f6fd06ab4909161faa97016b79"}]},
  {"cardFamilyHint":"001","resPrefix":"C001A","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C001A.jet","bytes":994694,"sha256":"00c6d20860a4da654055fb55c7cd7618555820ee591cb3a414f3ebfa4b94e7f8"},{"name":"C001A_Q.jet","bytes":35164,"sha256":"9dcdbd777509a4408a6b6c83caae696fb3363583d90515797031be11ada8d9d4"}]},
  {"cardFamilyHint":"002","resPrefix":"C002","defaultBody":true,"skinRefId":"Default_002","identityClass":"NATIVE_GENERATED_DEFAULT","packs":[{"name":"C002.jet","bytes":739583,"sha256":"8f3774c95f51ef13b72600bdfe7924a967eaf625f75d7539fb85b53452b6b196"},{"name":"C002_Q.jet","bytes":49298,"sha256":"978711f8e135b03c771835f159fb2be8d63b7778a815c0fbaa065199d2aef9b9"}]},
  {"cardFamilyHint":"003","resPrefix":"C003","defaultBody":true,"skinRefId":"Default_003","identityClass":"NATIVE_GENERATED_DEFAULT","packs":[{"name":"C003.jet","bytes":1014062,"sha256":"b358bdab7fb6027fba4a90de411067a58c46b7260acb72ed8e3bd5076512357a"},{"name":"C003_Q.jet","bytes":50813,"sha256":"1169c48ef4bea061560da2d5c112bb137641ea993c81a2a760a7792515587977"}]},
  {"cardFamilyHint":"003","resPrefix":"C003A","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C003A.jet","bytes":1098787,"sha256":"a4565b0fdb8aeec1e5ea1ac122c0edc72a9ed92b9cb1e71043e0d65c60db4784"},{"name":"C003A_Q.jet","bytes":84041,"sha256":"4f1bfb8945f5b4a8d19077a27606cb1880a441a9b0c0f7e7a626f59e0959f927"}]},
  {"cardFamilyHint":"003","resPrefix":"C003B","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C003B.jet","bytes":969634,"sha256":"2917ddbd8ab29610bb92c50e3ac4129f4ba77bdaeac01dfc2550197e4501528b"},{"name":"C003B_Q.jet","bytes":86265,"sha256":"ed8a99b2eea82c16bf9d3e849b90862cff30963323651160293cd70e3eccc62e"}]},
  {"cardFamilyHint":"003","resPrefix":"C003C","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C003C.jet","bytes":1349900,"sha256":"82a59a42e9751e0509d78af207056702965862787da84c5ae24df19df7ee4f35"},{"name":"C003C_Q.jet","bytes":79388,"sha256":"334ab214ec4422bb51dabace8ca89095f7f961cc48c8d7de5ed2c1d31b37dac7"}]},
  {"cardFamilyHint":"004","resPrefix":"C004","defaultBody":true,"skinRefId":"Default_004","identityClass":"NATIVE_GENERATED_DEFAULT","packs":[{"name":"C004.jet","bytes":1246194,"sha256":"403634344564e6e6c889607ee4fa202b5b4d2b4ef066d52d2e611139ede743df"},{"name":"C004_Q.jet","bytes":52685,"sha256":"08f6e49a8237350b583f2730cdc48428173cbca87c7fd9619ba8973c3ad70f05"}]},
  {"cardFamilyHint":"004","resPrefix":"C004A","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C004A.jet","bytes":1287504,"sha256":"9e80bda2ae42af3d2e0f495ceb47309534d8b9d32b7a10d987bd66b1085d7bb5"},{"name":"C004A_Q.jet","bytes":36318,"sha256":"50b787244441af0969362f42cf0ad5f85cbff377340cab7aeceee2a4afe98e7f"}]},
  {"cardFamilyHint":"004","resPrefix":"C004B","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C004B.jet","bytes":1264674,"sha256":"188dbf1b3369f8e28d6fafb7d4c2f5e2a475b7cf84f405503ecb34a8791ec761"},{"name":"C004B_Q.jet","bytes":35962,"sha256":"234c9b199a79b17952ab310303c0087e7d30b892961a4d58cdff04f36d0a4b48"}]},
  {"cardFamilyHint":"004","resPrefix":"C004C","defaultBody":false,"skinRefId":null,"identityClass":"ART_NAMESPACE_ONLY","packs":[{"name":"C004C.jet","bytes":1238709,"sha256":"0c7a6eab9f6af7120c011429231b7e3aecbb3919a7cd188b9caf07aa99b1fc8a"},{"name":"C004C_Q.jet","bytes":33240,"sha256":"b26c2aa15f10f4c53538dbf40550f581d4f37738c14d08c55e6734d5dbc709c2"}]}
] as const;
