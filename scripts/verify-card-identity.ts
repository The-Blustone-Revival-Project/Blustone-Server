import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { migrateCardInstanceNamespace } from "../src/card-instance-namespace.js";
import type { LocalGameState } from "../src/game.js";

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) throw new Error("Usage: verify-card-identity <private before save> <private after save>");
const before = JSON.parse(readFileSync(beforePath, "utf8"));
const after = JSON.parse(readFileSync(afterPath, "utf8"));
const expected = structuredClone(before);
expected.gameStates = before.gameStates.map(([pvid, game]: [number, LocalGameState]) => [pvid, migrateCardInstanceNamespace(game)]);
if (!isDeepStrictEqual(after, expected)) throw new Error("Save differs outside the explicit identity mapping; details remain private");
console.log(JSON.stringify({ onlyCardIdentitiesChanged: true, accounts: after.accounts.length,
  gameStates: after.gameStates.length, namespace: 1 }));
