import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function preflight(root, profile) {
  const names = profile.env.BLUSTONE_PACKAGE_NAMES.split(',').filter(Boolean);
  if (new Set(names).size !== names.length || names.length !== profile.expectedPackages) throw new Error('Resource package count/order is invalid');
  for (const name of names) {
    if (!/^[\w.-]+\.jet$/i.test(name)) throw new Error('Unsafe package name');
    const candidates = [profile.env.BLUSTONE_PACKAGE_DIR, profile.env.BLUSTONE_RESOURCE_ASSET_DIR].map(dir => path.resolve(root, dir, name));
    if (!candidates.some(file => existsSync(file) && statSync(file).isFile())) throw new Error(`Missing ${name}. Import the pinned resource bundle; do not use a legacy fallback.`);
  }
  for (const key of ['BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP']) {
    if (profile.env[key] !== '1634683') throw new Error(`Unexpected E6 stamp: ${key}`);
  }
  if (!existsSync(path.resolve(root, profile.env.BLUSTONE_PACKAGE_TREE_DIR, 'UI_XML_RO.db', 'CURRENT'))) throw new Error('Active UI database tree missing');
  return names.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const profile = JSON.parse(readFileSync(path.join(root, 'config/profiles/current-e6.json'), 'utf8'));
  const count = preflight(root, profile);
  if (process.argv.includes('--hashes')) {
    const records = JSON.parse(readFileSync(path.join(root, 'resources/manifests/imported-files.json'), 'utf8'));
    for (const row of records) {
      const file = path.resolve(root, row.destination);
      if (statSync(file).size !== row.bytes || createHash('sha256').update(readFileSync(file)).digest('hex') !== row.sha256) throw new Error(`Changed imported input: ${row.destination}`);
    }
    console.log(`Verified ${records.length} imported files by SHA-256`);
  }
  console.log(`E6 resource preflight passed: ${count} packages`);
}
