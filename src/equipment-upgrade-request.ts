/** Native equipment request grammar only; never authorizes upgrade/settlement. */
export interface EquipmentUpgradeRequest { inst_id: string; slot: 0 | 1 | 2; price_type: number; source_inst_ids: string[] }
function id(value: unknown): string {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !/^[1-9]\d*$/.test(text) || BigInt(text) > 0xffff_ffff_ffff_ffffn)
    throw new TypeError("Invalid uint64 equipment Hunter identity");
  return text;
}
function scalar(value: unknown, label: string): number {
  const num = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof num !== "number" || !Number.isInteger(num) || num < 0 || num > 0x7fff_ffff)
    throw new TypeError(`Invalid equipment ${label}`);
  return num;
}
/** Native form fields are strings. Rank sources are JSON dumped uint64 vector;
 * this parser also admits already-decoded arrays as replica transport policy.
 * Unsafe JS numeric IDs refuse instead of silently rounding ownership. */
export function parseEquipmentUpgradeRequest(action: "level" | "rank", raw: unknown): EquipmentUpgradeRequest {
  if (action !== "level" && action !== "rank") throw new TypeError("Unknown equipment action");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Expected equipment request");
  const row = raw as Record<string, unknown>, target = id(row.inst_id), part = scalar(row.part, "part");
  if (part < 1 || part > 3) throw new TypeError("Equipment part must be native wire1..3");
  let sources: unknown = [];
  if (action === "rank") {
    try {
      if(typeof row.source_inst_ids === "string") {
        const text=row.source_inst_ids.trim();
        // Native dumps uint64 numbers as decimal JSON tokens. Retain those
        // tokens before Number conversion can discard their high bits.
        if(/^\[\s*(?:[1-9]\d*\s*(?:,\s*[1-9]\d*\s*)*)?\]$/.test(text)) {
          const inner=text.slice(1,-1).trim();
          sources=inner?inner.split(",").map(value=>value.trim()):[];
        } else sources=JSON.parse(text);
      } else sources=row.source_inst_ids;
    }
    catch { throw new TypeError("Equipment source_inst_ids must be JSON array"); }
    if (!Array.isArray(sources)) throw new TypeError("Equipment source_inst_ids must be array");
  }
  const ids = (sources as unknown[]).map(id);
  if (ids.includes(target) || new Set(ids).size !== ids.length)
    throw new TypeError("Equipment sources must be distinct from target and one another");
  return { inst_id: target, slot: (part - 1) as 0 | 1 | 2,
    price_type: scalar(row.price_type, "price_type"), source_inst_ids: ids };
}
