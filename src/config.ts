import { repositoryPath } from "./paths.js";
import path from "node:path";

export interface ServerConfig {
  port: number;
  host: string;
  baseUrl: string;
  catalogPath?: string;
  stateFile?: string;
  resourceVersion: string;
  packageDirectory: string;
  packageNames: string[];
  packageMode: string;
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) throw new Error(`${name} must be a positive port number`);
  return parsed;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = positiveInteger(env.BLUSTONE_PORT, 8080, "BLUSTONE_PORT");
  const baseUrl = env.BLUSTONE_BASE_URL ?? `http://127.0.0.1:${port}`;
  try { new URL(baseUrl); } catch { throw new Error("BLUSTONE_BASE_URL must be an absolute URL"); }
  const packageNames = (env.BLUSTONE_PACKAGE_NAMES ?? "E_NEW.jet,E_MIDAGE.jet")
    .split(",").map((name) => name.trim()).filter((name) => /^[A-Za-z0-9_.-]+\.jet$/i.test(name));
  return {
    port,
    host: env.BLUSTONE_BIND_HOST ?? "127.0.0.1",
    baseUrl: baseUrl.replace(/\/$/, ""),
    catalogPath: env.BLUSTONE_CATALOG_PATH,
    stateFile: env.BLUSTONE_STATE_FILE,
    resourceVersion: env.BLUSTONE_RESOURCE_VERSION ?? "0",
    packageDirectory: path.resolve(env.BLUSTONE_PACKAGE_DIR ?? repositoryPath("resources", "runtime", "packages")),
    packageNames,
    packageMode: env.BLUSTONE_PACKAGE_MODE ?? "",
  };
}
