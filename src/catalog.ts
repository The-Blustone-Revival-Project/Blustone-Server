import { repositoryPath } from "./paths.js";
import fs from "node:fs";
import path from "node:path";

const endpointPattern = /^\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.*?%=&/-]+$/;
const unprefixedPattern = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.*?%=&/-]+$/;

const servicePrefixes = new Set([
  "abyss", "account", "achievement", "arena", "card_handler", "dailyquest",
  "episode", "explore", "fishing", "friend", "gacha_period", "gem", "guild",
  "gym", "gvg", "launcher", "linearquest", "lobby", "message", "mirage",
  "mission", "pv_account", "pv_tracker", "push", "random_box", "reference",
  "relation", "roulette", "scenario", "scheduler", "shared_secret", "shop",
  "skin", "supply", "tuto", "v2", "webview", "world",
]);

const curatedEndpoints = new Set([
  "/launcher/GetBaseInfo",
  "/shared_secret/Exchange",
  "/v2/account/RegisterGuest",
  "/v2/account/Login",
  "/account/ConfirmNickname",
  "/account/Unbind",
  "/account/Unregister",
  "/pv_account/get_token",
  "/pv_account/register_push_token",
]);

const localStatePaths = new Set([
  "/AUTHORIZATION_REQUEST",
  "/LANGUAGE_SETTING",
  "/LOADED_IMAGE",
  "/LOCAL_NOTI",
  "/PREFERENCE",
  "/VERSION",
  "/selected_server",
]);

export function defaultCatalogPath(): string {
  return repositoryPath("resources", "reference", "native-all-strings.tsv");
}

function normalizeCandidate(candidate: string): string | undefined {
  const value = candidate.trim();
  if (!value || value.length > 120 || localStatePaths.has(value)) return undefined;

  const normalized = value.startsWith("/") ? value : `/${value}`;
  const matcher = value.startsWith("/") ? endpointPattern : unprefixedPattern;
  if (!matcher.test(value)) return undefined;

  const prefix = normalized.split("/")[1];
  if (!servicePrefixes.has(prefix)) return undefined;
  return normalized;
}

export function discoverEndpoints(sourcePath = defaultCatalogPath()): string[] {
  const endpoints = new Set(curatedEndpoints);
  if (!fs.existsSync(sourcePath)) return [...endpoints].sort();

  for (const line of fs.readFileSync(sourcePath, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("\t");
    if (separator < 0) continue;
    const normalized = normalizeCandidate(line.slice(separator + 1));
    if (normalized) endpoints.add(normalized);
  }
  return [...endpoints].sort();
}

export function groupEndpoints(endpoints: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const endpoint of endpoints) {
    const prefix = endpoint.split("/")[1];
    (groups[prefix] ??= []).push(endpoint);
  }
  return Object.fromEntries(
    Object.entries(groups).sort(([left], [right]) => left.localeCompare(right)),
  );
}
