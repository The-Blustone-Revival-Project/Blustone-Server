import { copyFileSync, constants, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { ServerState } from "../src/state.js";
import { migrateCardInstanceNamespace } from "../src/card-instance-namespace.js";
import type { LocalGameState } from "../src/game.js";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error("Usage: preview-card-identity <source save> <new private staged save>");
const input = path.resolve(inputArg), output = path.resolve(outputArg);
if (input.toLowerCase() === output.toLowerCase()) throw new Error("Preview output must differ from source");
const originalBytes = readFileSync(input);
const before = JSON.parse(originalBytes.toString("utf8"));
if (!Array.isArray(before.gameStates)) throw new Error("Preview requires an explicit game-state snapshot");
const expected = structuredClone(before);
expected.gameStates = before.gameStates.map(([pvid, game]: [number, LocalGameState]) => [pvid, migrateCardInstanceNamespace(game)]);
mkdirSync(path.dirname(output), { recursive: true });
copyFileSync(input, output, constants.COPYFILE_EXCL);
new ServerState("http://10.0.2.2:8080", output);
const after = JSON.parse(readFileSync(output, "utf8"));
if (!isDeepStrictEqual(after, expected)) throw new Error("Preview altered values outside the explicit card identity mapping; source unchanged");
if (!readFileSync(input).equals(originalBytes)) throw new Error("Source changed during preview; discard the staged result");
console.log(JSON.stringify({ sourceUnchanged: true, onlyCardIdentitiesChanged: true,
  accounts: after.accounts.length, gameStates: after.gameStates.length,
  hunters: after.gameStates.reduce((n: number, row: [number, LocalGameState]) => n + row[1].starter_cards.length + row[1].recruited_cards.length, 0),
  namespace: 1 }));
