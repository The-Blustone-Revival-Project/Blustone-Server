import { parseGemInstances, type GemInstance, type GemReference } from "./gem-instances.js";

function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Expected Gem polish object");
  return raw as Record<string, unknown>;
}

/** Offline outcome decoding, not settlement validation or an outcome generator.
 * Ga63294 only parses result1; Gbd2368 queues prior failures and chooses the
 * final animation from the refreshed failure counter. Wallets, item quantities,
 * achievements, growth, chance and batch charging are deliberately not decoded.
 * Positive tries bounded by the request and stable ownership metadata are local
 * admission safeguards, not recovered original backend transition rules. */
export function parseGemPolishOutcome(raw: unknown, requestedMaxTries: number,
  owned: GemInstance, references: readonly GemReference[], knownHunters: ReadonlySet<string>) {
  if (!Number.isInteger(requestedMaxTries) || requestedMaxTries < 1 || requestedMaxTries > 0x7fff_ffff)
    throw new TypeError("Gem polish requested maximum must be positive signed32");
  const envelope = object(raw);
  if (envelope.result_code !== 1) throw new TypeError("Gem polish outcome requires accepted result1");
  const data = object(envelope.ret_data), tries = data.tries;
  if (typeof tries !== "number" || !Number.isInteger(tries) || tries < 1 || tries > requestedMaxTries)
    throw new TypeError("Gem polish actual tries must be positive and bounded by request");
  const gem = parseGemInstances({ result_code: 1, ret_data: [data.gem] }, references, knownHunters)[0];
  for (const key of ["inst_id", "ref_id", "rank", "target_inst_id", "position"] as const)
    if (gem[key] !== owned[key]) throw new TypeError(`Gem polish changed owned ${key}`);
  if (!gem.abilities) throw new TypeError("Gem polish outcome needs authoritative failure counter and abilities");
  return { tries, gem, animation: { priorFailures: tries - 1,
    final: gem.abilities.level_up_failed === 0 ? "success" as const : "failure" as const } };
}
