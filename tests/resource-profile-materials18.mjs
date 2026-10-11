import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { prepareProfile } from '../scripts/profiles/prepare-e6-materials18.mjs';
import { preflight } from '../scripts/resources/verify.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = path.join(root, 'config/profiles/current-e6-materials.json');
const sourceBytes = readFileSync(baselineFile);
const baseline = JSON.parse(sourceBytes);
const pins = JSON.parse(readFileSync(path.join(root, 'resources/manifests/character-materials18-originals.json'), 'utf8'));
const imported = JSON.parse(readFileSync(path.join(root, 'resources/manifests/imported-files.json'), 'utf8'));
for (const pin of pins) {
  const original = imported.find(row => row.destination === pin.destination);
  assert.ok(original);
  assert.deepEqual([pin.source, pin.bytes, pin.sha256], [original.source, original.bytes, original.sha256]);
}
const candidate = prepareProfile(baseline, { root });
assert.equal(candidate.expectedPackages, 150);
assert.equal(candidate.resourceStamp, '1634685', 'reserved1634684 E7 stamp must not be reused');
assert.equal(candidate.preparedOnly, true);
assert.equal(candidate.env.BLUSTONE_CARD_REFERENCE_PROFILE, 'materials');
assert.equal(preflight(root, candidate), 150);
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(',').slice(0, 139), baseline.env.BLUSTONE_PACKAGE_NAMES.split(','));
assert.deepEqual(prepareProfile(candidate, { root }), candidate, 'same complete selection is idempotent');
const stampKeys = ['BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP'];
for (const [key, value] of Object.entries(baseline.env))
  if (!['BLUSTONE_PACKAGE_NAMES', ...stampKeys].includes(key)) assert.equal(candidate.env[key], value);
const future = structuredClone(baseline);
future.env.BLUSTONE_RESOURCE_VERSION = '1635000';
assert.equal(prepareProfile(future, { root }).resourceStamp, '1635001');
for (const value of ['0', '-1', '001', 'x', '1.5', '2147483648', 1634683]) {
  const invalid = structuredClone(baseline);
  invalid.env.BLUSTONE_RESLIST_STAMP = value;
  const before = structuredClone(invalid);
  assert.throws(() => prepareProfile(invalid, { root }), /Invalid/);
  assert.deepEqual(invalid, before);
}
const overflow = structuredClone(baseline);
overflow.env.BLUSTONE_RESOURCE_VERSION = '2147483647';
assert.throws(() => prepareProfile(overflow, { root }), /exceeds/);
const reordered = structuredClone(baseline);
reordered.env.BLUSTONE_PACKAGE_NAMES = reordered.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(',');
assert.throws(() => prepareProfile(reordered, { root }), /exact complete E6/);
const partial = structuredClone(baseline);
partial.env.BLUSTONE_PACKAGE_NAMES += ',' + pins[0].name;
partial.expectedPackages++;
assert.throws(() => prepareProfile(partial, { root }), /exact complete E6/);

const temp = mkdtempSync(path.join(tmpdir(), 'blustone-materials18-'));
try {
  mkdirSync(path.join(temp, 'assets'));
  mkdirSync(path.join(temp, 'packages'));
  const input = structuredClone(baseline);
  input.env.BLUSTONE_RESOURCE_ASSET_DIR = 'assets';
  input.env.BLUSTONE_PACKAGE_DIR = 'packages';
  const fixtures = pins.map(pin => {
    const bytes = Buffer.from(`original fixture ${pin.name}`);
    writeFileSync(path.join(temp, 'assets', pin.name), bytes);
    return { ...pin, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  assert.equal(prepareProfile(input, { root: temp, originals: fixtures }).expectedPackages, 150);
  writeFileSync(path.join(temp, 'packages', fixtures[0].name), 'conflicting preferred source');
  assert.throws(() => prepareProfile(input, { root: temp, originals: fixtures }), /changed\/conflicting/);
  rmSync(path.join(temp, 'packages', fixtures[0].name));
  writeFileSync(path.join(temp, 'assets', fixtures[0].name), 'corruption');
  assert.throws(() => prepareProfile(input, { root: temp, originals: fixtures }), /changed/);
  rmSync(path.join(temp, 'assets', fixtures[0].name));
  assert.throws(() => prepareProfile(input, { root: temp, originals: fixtures }), /missing/);
} finally { rmSync(temp, { recursive: true, force: true }); }

function snapshot(profile) {
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', `
    import {starterReference,starterInventory,recruitBirthRanks} from './src/bootstrap.ts';
    import {itemReference,HUNTER_TRACE_ITEMS} from './src/hunter-traces.ts';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,birth:recruitBirthRanks,
      item:itemReference(),exchange:HUNTER_TRACE_ITEMS}));`],
    { cwd: root, env: { ...process.env, ...profile.env, BLUSTONE_GACHA_CARD: '002', BLUSTONE_PARTY_SIZE: '1' },
      encoding: 'utf8', timeout: 20_000 }));
}
const prior = snapshot(baseline);
const next = snapshot(candidate);
assert.equal(prior.refs.length, 14);
assert.equal(next.refs.length, 18);
assert.deepEqual(next.refs.filter(row => !['014', '030', '048', '054'].includes(row.id)), prior.refs,
  'all fourteen existing reference rows including stats and skills remain byte-equivalent');
assert.deepEqual(next.inventory, prior.inventory);
assert.deepEqual(next.birth, prior.birth);
assert.deepEqual(next.exchange, prior.exchange);
assert.deepEqual(next.item.trace, prior.item.trace, 'no new acquisition/drop links');
for (const card of next.refs) {
  const bindings = next.item.item.filter(item => item.use_type === 3 && item.effect === card.id);
  assert.equal(bindings.length, 1);
  assert.ok(bindings[0].collect_qty > 0);
}
for (const role of [1, 2, 3, 4]) assert.ok(next.refs.some(card => card.base.role === role && card.base.is_source === 0));
for (const id of ['014', '030', '048', '054']) {
  const row = next.refs.find(row => row.id === id);
  assert.ok(row.stat.every(stat => stat.hp === '1000' && stat.atk === '100' && stat.def === '50'));
  assert.ok(row.skill.every(slot => slot.effect.length === 0 && slot.cost === 0));
}
const output = path.join(root, 'config/profiles/current-e6-materials18.json');
const preparedBytes = readFileSync(output);
assert.deepEqual(JSON.parse(preparedBytes), candidate);
const script = path.join(root, 'scripts/profiles/prepare-e6-materials18.mjs');
assert.deepEqual(JSON.parse(execFileSync(process.execPath, [script, '--inspect-only'], { encoding: 'utf8' })), candidate);
execFileSync(process.execPath, [script], { encoding: 'utf8' });
assert.deepEqual(readFileSync(output), preparedBytes);
assert.deepEqual(readFileSync(baselineFile), sourceBytes);
console.log('materials18 readiness passed:11 original pins,139→150/stamp1634685,14→18 references, positive navigation bindings, neutral fixtures, isolation/idempotence, corrupt/missing/conflict refusal and unchanged ownership/acquisition.');
