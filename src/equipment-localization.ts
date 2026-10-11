/** Recovered native TYPE table, NOT equipment IDs or an invented reference.
 * ELF67886c initializes six libc++ strings at ELF21cf288 (24 bytes/TYPE).
 * CHAR_STR source keys and native lookup arguments are kept distinct below.
 */
const FIELDS = [
  { name: "WEAPON", description: "WEAPON_DESC" },
  { name: "ARMOR", description: "ARMOR_DESC" },
  { name: "ACCESSORY", description: "ACCE_DESC" },
] as const;
export type EquipmentTextKind = "name" | "description";
export type EquipmentLocale = "KO" | "EN" | "JA" | "SC" | "TC";

export function equipmentTextField(internalType: number, kind: EquipmentTextKind): string {
  if (!Number.isInteger(internalType) || internalType < 0 || internalType > 2 ||
      (kind !== "name" && kind !== "description")) throw new TypeError("Invalid equipment TYPE/text kind");
  return FIELDS[internalType][kind];
}

/** Exact query passed to GetStrDBData(table4), not a resolved Hunter join.
 * GetEquipName/Desc's selector is CSRCard.GetAwake at the popup caller.
 * No Hunter ref_id is inserted on this bounded path. */
export function nativeEquipmentTextQuery(awake: number, internalType: number, kind: EquipmentTextKind): string {
  if (!Number.isInteger(awake) || awake < 0 || awake > 0xffff_ffff) throw new TypeError("Invalid unsigned Awake selector");
  return (awake === 0 ? "" : "_" + awake.toString(10)) + "|" + equipmentTextField(internalType, kind);
}

/** Proven locale table at ELF217c0e0 used by FindCharRefString. */
export function equipmentLocale(nativeLanguage: number): EquipmentLocale {
  const locales: readonly EquipmentLocale[] = ["KO", "EN", "JA", "SC", "TC"];
  if (!Number.isInteger(nativeLanguage) || nativeLanguage < 0 || nativeLanguage >= locales.length)
    throw new TypeError("Unknown native language index");
  return locales[nativeLanguage];
}

/** Exact offline CHAR_STR source lookup. This deliberately does not claim
 * nativeEquipmentTextQuery resolves through this Hunter-prefixed key. */
export function originalEquipmentText(table: Readonly<Record<string, unknown>>, refId: string,
  internalType: number, kind: EquipmentTextKind, locale: EquipmentLocale): string | undefined {
  if (!/^\d{3}$/.test(refId) || !["KO", "EN", "JA", "SC", "TC"].includes(locale))
    throw new TypeError("Invalid original Hunter text identity/locale");
  const row = table[refId + "|" + equipmentTextField(internalType, kind)];
  if (!row || typeof row !== "object" || Array.isArray(row)) return undefined;
  const text = (row as Record<string, unknown>)[locale];
  return typeof text === "string" ? text : undefined;
}
