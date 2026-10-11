import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareProfile } from '../scripts/profiles/prepare-e7.mjs';
import { preflight } from '../scripts/resources/verify.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'config/profiles/current-e6.json');
const sourceBytes = readFileSync(inputPath);
const baseline = JSON.parse(sourceBytes);
const pins = JSON.parse(readFileSync(path.join(root, 'resources/manifests/episode07-originals.json'), 'utf8'));
const candidate = prepareProfile(baseline, { root });
assert.equal(baseline.expectedPackages, 139);
assert.equal(candidate.expectedPackages, 156);
assert.equal(candidate.resourceStamp, '1634684');
assert.equal(candidate.preparedOnly, true);
assert.equal(preflight(root,candidate),156,'prepared profile is accepted by the canonical launcher preflight');
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(',').slice(0, 139), baseline.env.BLUSTONE_PACKAGE_NAMES.split(','));
assert.deepEqual(prepareProfile(candidate, { root }), candidate);
for (const [key, value] of Object.entries(baseline.env)) {
  if (!['BLUSTONE_PACKAGE_NAMES', 'BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP'].includes(key)) assert.equal(candidate.env[key], value);
}
const stampKeys = ['BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP'];
const future = structuredClone(baseline);
future.env.BLUSTONE_RESOURCE_VERSION = '1635000';
future.env.BLUSTONE_RESLIST_HEADER_STAMP = '1634999';
const futureResult = prepareProfile(future, { root });
assert.equal(futureResult.resourceStamp, '1635001');
for (const key of stampKeys) assert.equal(futureResult.env[key], '1635001');
for (const value of ['0', '-1', '001', '1.2', 'x', '2147483648', '', 1634683]) {
  const invalid = structuredClone(baseline);
  invalid.env.BLUSTONE_RESLIST_STAMP = value;
  const before = structuredClone(invalid);
  assert.throws(() => prepareProfile(invalid, { root }), /Invalid/);
  assert.deepEqual(invalid, before);
}
const overflow = structuredClone(baseline);
overflow.env.BLUSTONE_RESOURCE_VERSION = '2147483647';
assert.throws(() => prepareProfile(overflow, { root }), /exceeds/);
const maxSelected = structuredClone(candidate);
for (const key of stampKeys) maxSelected.env[key] = '2147483647';
maxSelected.resourceStamp = '2147483647';
assert.equal(prepareProfile(maxSelected, { root }).resourceStamp, '2147483647');
const missingPrior = structuredClone(baseline);
missingPrior.env.BLUSTONE_PACKAGE_NAMES = missingPrior.env.BLUSTONE_PACKAGE_NAMES.split(',').filter(name => name !== 'UI_ITEM.jet').join(',');
missingPrior.expectedPackages--;
assert.throws(() => prepareProfile(missingPrior, { root }), /Missing prior/);

const temp = mkdtempSync(path.join(tmpdir(), 'blustone-e7-profile-'));
try {
  mkdirSync(path.join(temp, 'assets'));
  mkdirSync(path.join(temp, 'packages'));
  const testProfile = structuredClone(baseline);
  testProfile.env.BLUSTONE_RESOURCE_ASSET_DIR = 'assets';
  testProfile.env.BLUSTONE_PACKAGE_DIR = 'packages';
  const testPins = pins.map(pin => {
    const bytes = Buffer.from(`original test fixture ${pin.name}`);
    writeFileSync(path.join(temp, 'assets', pin.name), bytes);
    return { name: pin.name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  assert.equal(prepareProfile(testProfile, { root: temp, originals: testPins }).expectedPackages, 156);
  writeFileSync(path.join(temp, 'packages', testPins[0].name), 'conflicting preferred package');
  assert.throws(() => prepareProfile(testProfile, { root: temp, originals: testPins }), /conflicting/);
  rmSync(path.join(temp, 'packages', testPins[0].name));
  writeFileSync(path.join(temp, 'assets', testPins[0].name), 'corrupt original');
  assert.throws(() => prepareProfile(testProfile, { root: temp, originals: testPins }), /changed/);
  rmSync(path.join(temp, 'assets', testPins[0].name));
  assert.throws(() => prepareProfile(testProfile, { root: temp, originals: testPins }), /missing/);
} finally { rmSync(temp, { recursive: true, force: true }); }

const outputPath = path.join(root, 'config/profiles/current-e7.json');
const priorOutput = existsSync(outputPath) ? readFileSync(outputPath) : undefined;
const inspect = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/profiles/prepare-e7.mjs'), '--inspect-only'], { encoding: 'utf8' }));
assert.deepEqual(inspect, candidate);
assert.equal(existsSync(outputPath), priorOutput !== undefined);
if (priorOutput) assert.deepEqual(readFileSync(outputPath), priorOutput);
if (priorOutput) {
  execFileSync(process.execPath,[path.join(root,'scripts/profiles/prepare-e7.mjs')],{encoding:'utf8'});
  assert.deepEqual(readFileSync(outputPath),priorOutput,'same prepared profile write is idempotent');
}
assert.deepEqual(readFileSync(inputPath), sourceBytes);
assert.deepEqual(baseline, JSON.parse(sourceBytes));
console.log('E7 profile preparation passed: original hashes, 139→156, idempotence, future/max stamps, malformed/overflow refusal, corrupted/conflicting originals, prior prerequisites, inspect-only and E6 immutability.');
