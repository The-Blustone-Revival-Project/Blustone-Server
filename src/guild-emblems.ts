import { createHash } from "node:crypto";

/** Stock-picker names are ORIGINAL UI res-name values, corroborated by
 * CSRPopUpGuildChangeIcon's BT_THUMB1..6 / SPR_RANK / GetResName path.
 * GD_IMG_7..10 exist as original sprites but are not current picker choices.
 */
export const GUILD_PICKER_EMBLEMS = ["GD_IMG_1", "GD_IMG_2", "GD_IMG_3", "GD_IMG_4", "GD_IMG_5", "GD_IMG_6"] as const;
export const GUILD_SPRITE_EMBLEMS = [...GUILD_PICKER_EMBLEMS, "GD_IMG_7", "GD_IMG_8", "GD_IMG_9", "GD_IMG_10"] as const;
export const GUILD_EMBLEM_SOURCE = {
  path: "resources/runtime/assets/GUILD.jet", bytes: 2258272,
  sha256: "9a2964fa1137b4ed6d09570103397ab3a221f31c97ed462c03a94fbe01c5fe66",
  fallbackSprite: "GD_IMG_1",
  headerOffsets: [2254903, 2254993, 2255083, 2255173, 2255263, 2255353, 2255443, 2255533, 2255623, 2255713],
} as const;
export const GUILD_PICKER_UI_SOURCE = {
  path: "resources/runtime/packages/UI_XML_RO.db/000005.ldb",
  sha256: "054790fe369d381490a101a38e123de22e8ca4eb28f8255d456515b6ee25bb3e",
  // Both original locale entries bind BT_THUMB1..6/SPR_RANK to these exact IDs.
  // This is original metadata provenance, not a live scene visibility claim.
  recordSuffix: "GUILD/G_P_ICON",
} as const;

/** Original CRMResMap.ExtractJETInfo reads24-byte records, packed-size+8,
 * uint64 name+12; RM10to38 alphabet is the following38 symbols. Names are
 * neither file ordinals nor CRC32 values. Read metadata only; no extraction.
 */
export function jetRecordHeaders(bytes: Buffer) {
  const records: Array<{ name: string; offset: number; payloadOffset: number; packedBytes: number; rawBytes: number }> = [];
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._";
  let offset = 0;
  while (offset < bytes.length) {
    if (bytes.length - offset < 24) throw new Error("Truncated JET record header");
    const packedBytes = bytes.readUInt32LE(offset + 8);
    if (packedBytes === 0 || offset + 24 + packedBytes > bytes.length) throw new Error("Invalid JET record payload extent");
    let id = bytes.readBigUInt64LE(offset + 12), name = "";
    while (id > 0n) { name = alphabet[Number(id % 38n)] + name; id /= 38n; }
    records.push({ name, offset, payloadOffset: offset + 24, packedBytes, rawBytes: bytes.readUInt32LE(offset) });
    offset += 24 + packedBytes;
  }
  return records;
}

export function verifyGuildEmblemSource(bytes: Buffer) {
  if (bytes.length !== GUILD_EMBLEM_SOURCE.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== GUILD_EMBLEM_SOURCE.sha256)
    throw new Error("Guild original source pin mismatch");
  const headers = jetRecordHeaders(bytes);
  const sprites = GUILD_SPRITE_EMBLEMS.map((id, index) => {
    const matches = headers.filter((row) => row.name === id);
    if (matches.length !== 1) throw new Error("Missing or ambiguous original Guild sprite");
    const row = matches[0];
    if (row.offset !== GUILD_EMBLEM_SOURCE.headerOffsets[index] || row.rawBytes !== 66 || row.packedBytes !== 66 ||
        bytes.subarray(row.payloadOffset, row.payloadOffset + 2).toString("ascii") !== "S2")
      throw new Error("Guild sprite is not the pinned original S2 record");
    return { id, headerOffset: row.offset, sourceBytes: row.rawBytes,
      picker: (GUILD_PICKER_EMBLEMS as readonly string[]).includes(id),
      sha256: createHash("sha256").update(bytes.subarray(row.payloadOffset, row.payloadOffset + row.packedBytes)).digest("hex") };
  });
  return { originalBytes: bytes.length, records: headers.length, fallbackSprite: GUILD_EMBLEM_SOURCE.fallbackSprite, sprites };
}

export const isGuildPickerEmblem = (value: unknown): value is typeof GUILD_PICKER_EMBLEMS[number] =>
  typeof value === "string" && (GUILD_PICKER_EMBLEMS as readonly string[]).includes(value);
