import { repositoryPath } from "./paths.js";
import { existsSync, readFileSync } from "node:fs";

// Original public R_EPISODE S01 graph; no fabricated stage IDs or events.
const source = repositoryPath("resources", "reference", "episodes", "EPISODE_S01.json");
if (!existsSync(source)) throw new Error("Recovered Episode S01 catalog missing");
interface EpisodeNode { id: string; type: string; childs?: EpisodeNode[]; reward?: { item?: { ref_id: string; qty: number }[]; free_iap?: number; iap?: number } }
export const episodeIds = new Set<string>();
export const episodeChapters = new Map<string, EpisodeNode>();
function visit(node: EpisodeNode) {
  if (!node || typeof node.id !== "string" || !node.id || episodeIds.has(node.id)) throw new Error("Invalid recovered Episode catalog");
  episodeIds.add(node.id);
  if (node.type === "episode") episodeChapters.set(node.id, node);
  for (const child of node.childs ?? []) visit(child);
}
export function episodeStoryIds(node: EpisodeNode): string[] {
  return node.type === "story" ? [node.id] : (node.childs ?? []).flatMap(episodeStoryIds);
}
visit(JSON.parse(readFileSync(source, "utf8")));

export interface EpisodeProgress { read_ids: string[]; cleared_ids: string[]; reward_ids: string[] }
export const emptyEpisodeProgress = (): EpisodeProgress => ({ read_ids: [], cleared_ids: [], reward_ids: [] });
export function normalizeEpisodeProgress(raw: unknown): EpisodeProgress {
  if (raw === undefined) return emptyEpisodeProgress();
  const state = raw as EpisodeProgress;
  if (!state || [state.read_ids, state.cleared_ids, state.reward_ids].some((ids) => !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string" || !episodeIds.has(id)) || new Set(ids).size !== ids.length))
    throw new Error("Malformed Episode progress");
  return structuredClone(state);
}
export function episodeLog(state: EpisodeProgress) {
  return { read_log: [...state.read_ids.map((id) => `r_${id}`), ...state.cleared_ids].sort().map((id) => ({ id })),
    reward_log: [...state.reward_ids].sort().map((id) => ({ id })) };
}
export function recordEpisodeProgress(state: EpisodeProgress, raw: unknown): boolean | null {
  if (typeof raw !== "string") return null;
  const read = raw.startsWith("r_");
  const id = read ? raw.slice(2) : raw;
  if (!episodeIds.has(id)) return null;
  const ids = read ? state.read_ids : state.cleared_ids;
  if (ids.includes(id)) return false;
  ids.push(id);
  return true;
}
