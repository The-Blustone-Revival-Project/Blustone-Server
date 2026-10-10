import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve from this module, never the shell's working directory or a sibling repo.
const parent = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const repositoryRoot = path.basename(parent) === "dist" ? path.dirname(parent) : parent;
export const repositoryPath = (...parts: string[]): string => path.join(repositoryRoot, ...parts);
