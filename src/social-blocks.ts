/** CPVRelation RequestBlock G817888 / RequestUnBlock G818420 send target_list.
 * ReqBlockListCB G8194c0 converts a numerically indexed row array into its C++
 * map. That internal map is NOT the wire shape. No block limits were recovered.
 */
export type SocialBlocks = Record<string, string>;

export function socialTargetList(raw: unknown): number[] {
  let targets: unknown = raw;
  if (typeof raw === "string") {
    try { targets = JSON.parse(raw); }
    catch { throw new TypeError("target_list must be a JSON array"); }
  }
  if (!Array.isArray(targets) || targets.length === 0 || targets.some((target) =>
    typeof target !== "number" || !Number.isSafeInteger(target) || target <= 0))
    throw new TypeError("target_list must contain positive safe integer account IDs");
  return [...new Set(targets as number[])];
}

export function socialBlockRows(blocks: SocialBlocks) {
  return Object.entries(blocks).map(([key, target_nickname]) => {
    const target_pvid = Number(key);
    if (!Number.isSafeInteger(target_pvid) || target_pvid <= 0 ||
        String(target_pvid) !== key || typeof target_nickname !== "string" || !target_nickname.length)
      throw new TypeError("Invalid persisted social block");
    return { target_pvid, target_nickname };
  }).sort((a, b) => a.target_pvid - b.target_pvid);
}

/** Resolve every target before returning a new map, so a mixed invalid batch
 * cannot partially block or unblock anyone. Caller persists only on success.
 * Nicknames come from established local account identities, never user input.
 */
export function changeSocialBlocks(current: SocialBlocks, selfPvid: number, rawTargets: unknown,
  action: "block" | "unblock", resolveNickname: (pvid: number) => string | undefined): SocialBlocks {
  socialBlockRows(current);
  if (!Number.isSafeInteger(selfPvid) || selfPvid <= 0) throw new TypeError("Invalid authenticated account");
  const targets = socialTargetList(rawTargets);
  const checked = targets.map((pvid) => {
    if (pvid === selfPvid) throw new Error("Cannot block yourself");
    const present = Object.hasOwn(current, String(pvid));
    if (action === "unblock") {
      if (!present) throw new Error("Account is not blocked");
      return { pvid, nickname: current[String(pvid)]! };
    }
    if (present) throw new Error("Account is already blocked");
    const nickname = resolveNickname(pvid);
    if (typeof nickname !== "string" || !nickname.length) throw new Error("Unknown target account");
    return { pvid, nickname };
  });
  const next = { ...current };
  for (const { pvid, nickname } of checked) {
    if (action === "block") next[String(pvid)] = nickname;
    else delete next[String(pvid)];
  }
  return next;
}
