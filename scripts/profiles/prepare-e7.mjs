import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stampKeys = ['BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP'];
const required = ['UI_ITEM.jet', 'C012.jet', 'C036.jet', 'M008.jet', 'C030.jet', 'UI_SHOP.jet', 'C017.jet', 'CUT_E0401.jet', 'C040.jet', 'C040_EFT.jet', 'C040_Q.jet', 'C040_SND.jet', 'C054.jet'];
const maxStamp = 2147483647;

function parseStamp(value, label) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maxStamp) {
    throw new Error(`Invalid ${label}; positive signed 32-bit stamps are this preparation tool's local policy`);
  }
  return Number(value);
}

// Read-only preparation: validates before returning a cloned candidate. No server,
// environment, source profile, original file, or save is mutated by this function.
export function prepareProfile(profile, { root = repoRoot, originals } = {}) {
  const pins = originals ?? JSON.parse(readFileSync(path.join(root, 'resources/manifests/episode07-originals.json'), 'utf8'));
  if (!Array.isArray(pins) || pins.length !== 17 || new Set(pins.map(pin => pin.name)).size !== 17) throw new Error('Invalid E7 original inventory');
  const env = profile?.env;
  if (!env || typeof env.BLUSTONE_PACKAGE_NAMES !== 'string') throw new Error('Missing complete baseline package list');
  const names = env.BLUSTONE_PACKAGE_NAMES.split(',');
  if (names.some(name => !/^[\w.-]+\.jet$/.test(name)) || new Set(names).size !== names.length || names.length !== profile.expectedPackages) throw new Error('Invalid baseline package count/names');
  if (env.BLUSTONE_RESOURCE_ASSET_NAMES !== ',' || env.BLUSTONE_RESOURCE_ASSET_GLOB) throw new Error('Restore complete separate E6 selection first');
  for (const name of required) if (!names.includes(name)) throw new Error(`Missing prior original: ${name}`);
  if (typeof env.BLUSTONE_PACKAGE_DIR !== 'string' || typeof env.BLUSTONE_RESOURCE_ASSET_DIR !== 'string') throw new Error('Missing resource directories');
  const stamps = stampKeys.map(key => parseStamp(env[key], key));
  if (profile.resourceStamp !== undefined) stamps.push(parseStamp(profile.resourceStamp, 'resourceStamp'));
  const added = pins.filter(pin => !names.includes(pin.name));
  const next = Math.max(1634684, Math.max(...stamps) + (added.length > 0 ? 1 : 0));
  if (next > maxStamp) throw new Error('E7 CDN stamp exceeds this preparation tool signed 32-bit stamp policy');
  for (const pin of pins) {
    if (!/^[\w.-]+\.jet$/.test(pin.name) || !Number.isSafeInteger(pin.bytes) || pin.bytes <= 0 || !/^[a-f0-9]{64}$/.test(pin.sha256)) throw new Error('Malformed E7 original pin');
    const files = [...new Set([env.BLUSTONE_PACKAGE_DIR, env.BLUSTONE_RESOURCE_ASSET_DIR].map(dir => path.resolve(root, dir, pin.name)))];
    let present = false;
    for (const file of files) {
      if (!existsSync(file)) continue;
      present = true;
      if (!statSync(file).isFile() || statSync(file).size !== pin.bytes || createHash('sha256').update(readFileSync(file)).digest('hex') !== pin.sha256) throw new Error(`Original E7 pack missing/changed/conflicting: ${pin.name}`);
    }
    if (!present) throw new Error(`Original E7 pack missing: ${pin.name}`);
  }
  const candidate = structuredClone(profile);
  candidate.name = 'current-e7';
  candidate.source = 'Prepared from complete E6 selection plus 17 hash-pinned original E7 packages; native activation pending';
  candidate.preparedOnly = true;
  candidate.resourceStamp = String(next);
  candidate.env.BLUSTONE_PACKAGE_NAMES = [...names, ...added.map(pin => pin.name)].join(',');
  candidate.expectedPackages = names.length + added.length;
  for (const key of stampKeys) candidate.env[key] = String(next);
  return candidate;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--inspect-only')) throw new Error('Usage: node scripts/profiles/prepare-e7.mjs [--inspect-only]');
  const input = path.join(repoRoot, 'config/profiles/current-e6.json');
  const candidate = prepareProfile(JSON.parse(readFileSync(input, 'utf8')));
  if (args.includes('--inspect-only')) {
    console.log(JSON.stringify(candidate, null, 2));
  } else {
    const output = path.join(repoRoot, 'config/profiles/current-e7.json');
    const text=JSON.stringify(candidate, null, 2) + '\n';
    if (existsSync(output)) {
      if (readFileSync(output,'utf8')!==text) throw new Error('Existing E7 profile differs; refusing to overwrite reviewed selection or regress its stamp');
    } else {
      writeFileSync(output, text, {flag:'wx'});
    }
    console.log(`Prepared inactive current-e7: ${candidate.expectedPackages} original packages, stamp ${candidate.resourceStamp}. Live profile/state unchanged.`);
  }
}
