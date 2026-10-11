/** Recovered native TYPE table, NOT equipment IDs or an invented reference.
 * ELF67886c initializes six libc++ strings at ELF21cf288 (24 bytes/TYPE).
 * GetEquipName/Desc first COPY the Hunter ID at CSRCardInfo+0.
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

/** Exact query passed to GetStrDBData(table4), including the Hunter ID.
 * GetEquipName/Desc's selector is CSRCard.GetAwake at the popup caller.
 * ELF86aac8/86abd4 call the string COPY constructor ELF6c7efc with this
 * still in r1, retaining the ID before appending the optional Awake suffix. */
export function nativeEquipmentTextQuery(refId: string, awake: number, internalType: number, kind: EquipmentTextKind): string {
  if (typeof refId !== "string" || refId.length === 0 || /[|\0]/.test(refId)) throw new TypeError("Invalid Hunter text identity");
  if (!Number.isInteger(awake) || awake < 0 || awake > 0xffff_ffff) throw new TypeError("Invalid unsigned Awake selector");
  return refId + (awake === 0 ? "" : "_" + awake.toString(10)) + "|" + equipmentTextField(internalType, kind);
}

/** Proven locale table at ELF217c0e0 used by FindCharRefString. */
export function equipmentLocale(nativeLanguage: number): EquipmentLocale {
  const locales: readonly EquipmentLocale[] = ["KO", "EN", "JA", "SC", "TC"];
  if (!Number.isInteger(nativeLanguage) || nativeLanguage < 0 || nativeLanguage >= locales.length)
    throw new TypeError("Unknown native language index");
  return locales[nativeLanguage];
}

/** Exact CHAR_STR source lookup. Missing locale/key stays missing; no guessed
 * fallback, equipment-row-ID substitution or escaped line-break rewrite. */
export function originalEquipmentText(table: Readonly<Record<string, unknown>>, refId: string,
  internalType: number, kind: EquipmentTextKind, locale: EquipmentLocale, awake = 0): string | undefined {
  if (!["KO", "EN", "JA", "SC", "TC"].includes(locale)) throw new TypeError("Invalid original locale");
  const row = table[nativeEquipmentTextQuery(refId, awake, internalType, kind)];
  if (!row || typeof row !== "object" || Array.isArray(row)) return undefined;
  const text = (row as Record<string, unknown>)[locale];
  return typeof text === "string" ? text : undefined;
}
