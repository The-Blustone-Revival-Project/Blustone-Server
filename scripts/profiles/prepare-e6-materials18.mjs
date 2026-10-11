import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stampKeys = ['BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP'];
const packNames = ['C014_Q.jet', 'C014_EFT.jet', 'C014_SND.jet', 'C030_Q.jet', 'C030_EFT.jet', 'C030_SND.jet',
  'C048_Q.jet', 'C048_EFT.jet', 'C048_SND.jet', 'C054_Q.jet', 'C054_EFT.jet'];
const maxStamp = 2147483647;
function parseStamp(value, label) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maxStamp)
    throw new Error(`Invalid ${label}; positive signed32-bit stamp is local preparation policy`);
  return Number(value);
}

// Pure preparation: no environment, live server, private save or source mutation.
export function prepareProfile(profile, { root = repoRoot, originals, baselineNames } = {}) {
  const pins = originals ?? JSON.parse(readFileSync(path.join(root, 'resources/manifests/character-materials18-originals.json'), 'utf8'));
  if (!Array.isArray(pins) || pins.length !== 11 || pins.some((pin, i) => pin.name !== packNames[i])) throw new Error('Invalid materials18 original inventory/order');
  const originalNames = baselineNames ?? JSON.parse(readFileSync(path.join(repoRoot, 'config/profiles/current-e6.json'), 'utf8')).env.BLUSTONE_PACKAGE_NAMES.split(',');
  const env = profile?.env;
  if (!env || typeof env.BLUSTONE_PACKAGE_NAMES !== 'string') throw new Error('Missing complete E6 baseline');
  const names = env.BLUSTONE_PACKAGE_NAMES.split(',');
  if (names.some(name => !/^[\w.-]+\.jet$/.test(name)) || new Set(names).size !== names.length || names.length !== profile.expectedPackages) throw new Error('Invalid baseline package count/names');
  if (originalNames.length !== 139 || names.slice(0, 139).join(',') !== originalNames.join(',') ||
      ![139, 150].includes(names.length) || (names.length === 150 && names.slice(139).join(',') !== packNames.join(',')))
    throw new Error('Restore exact complete E6 selection; unrelated or partial extra groups refused');
  if (env.BLUSTONE_RESOURCE_ASSET_NAMES !== ',' || env.BLUSTONE_RESOURCE_ASSET_GLOB || env.BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA)
    throw new Error('Restore separate original E6 groups first');
  if (typeof env.BLUSTONE_PACKAGE_DIR !== 'string' || typeof env.BLUSTONE_RESOURCE_ASSET_DIR !== 'string') throw new Error('Missing resource directories');
  const stamps = stampKeys.map(key => parseStamp(env[key], key));
  if (profile.resourceStamp !== undefined) stamps.push(parseStamp(profile.resourceStamp, 'resourceStamp'));
  const added = names.length === 139;
  const next = Math.max(1634685, Math.max(...stamps) + (added ? 1 : 0));
  if (next > maxStamp) throw new Error('materials18 CDN stamp exceeds local signed32-bit stamp policy');
  for (const pin of pins) {
    if (!Number.isSafeInteger(pin.bytes) || pin.bytes <= 0 || !/^[a-f0-9]{64}$/.test(pin.sha256)) throw new Error('Malformed materials18 original pin');
    const files = [...new Set([env.BLUSTONE_PACKAGE_DIR, env.BLUSTONE_RESOURCE_ASSET_DIR].map(dir => path.resolve(root, dir, pin.name)))];
    let present = false;
    for (const file of files) {
      if (!existsSync(file)) continue;
      present = true;
      if (!statSync(file).isFile() || statSync(file).size !== pin.bytes || createHash('sha256').update(readFileSync(file)).digest('hex') !== pin.sha256)
        throw new Error(`Original materials18 pack changed/conflicting: ${pin.name}`);
    }
    if (!present) throw new Error(`Original materials18 pack missing: ${pin.name}`);
  }
  const candidate = structuredClone(profile);
  candidate.name = 'current-e6-materials18';
  candidate.source = 'Prepared E6 baseline139 plus11 hash-pinned original Hunter materials; 18 ordinary references with explicit neutral local stats/skills; native activation pending';
  candidate.preparedOnly = true;
  candidate.resourceStamp = String(next);
  candidate.env.BLUSTONE_CARD_REFERENCE_PROFILE = 'materials';
  candidate.env.BLUSTONE_PACKAGE_NAMES = [...originalNames, ...packNames].join(',');
  candidate.expectedPackages = 150;
  for (const key of stampKeys) candidate.env[key] = String(next);
  return candidate;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--inspect-only')) throw new Error('Usage: node scripts/profiles/prepare-e6-materials18.mjs [--inspect-only]');
  const input = path.join(repoRoot, 'config/profiles/current-e6-materials.json');
  const candidate = prepareProfile(JSON.parse(readFileSync(input, 'utf8')));
  if (args.includes('--inspect-only')) console.log(JSON.stringify(candidate, null, 2));
  else {
    const output = path.join(repoRoot, 'config/profiles/current-e6-materials18.json');
    const text = JSON.stringify(candidate, null, 2) + '\n';
    if (existsSync(output)) {
      if (readFileSync(output, 'utf8') !== text) throw new Error('Existing materials18 profile differs; refusing overwrite or stamp regression');
    } else writeFileSync(output, text, { flag: 'wx' });
    console.log(`Prepared inactive materials18:150 packages/stamp${candidate.resourceStamp}; live profile/save unchanged.`);
  }
}
