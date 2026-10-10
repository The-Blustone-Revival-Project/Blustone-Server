import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { buildOpenApi } from "../src/openapi.js";
import { defaultCatalogPath, discoverEndpoints } from "../src/catalog.js";

const root = path.resolve(import.meta.dirname, "..");
const openapi = buildOpenApi(discoverEndpoints(defaultCatalogPath()));
await fs.writeFile(path.join(root, "openapi.json"), JSON.stringify(openapi, null, 2) + "\n", "utf8");
await fs.writeFile(path.join(root, "openapi.yaml"), YAML.stringify(openapi), "utf8");
console.log(`Wrote ${path.join(root, "openapi.json")}`);
console.log(`Wrote ${path.join(root, "openapi.yaml")}`);
