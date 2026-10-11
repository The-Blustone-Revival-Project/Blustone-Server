import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function preflight(root, profile) {
  const names = profile.env.BLUSTONE_PACKAGE_NAMES.split(',');
  if (!Number.isSafeInteger(profile.expectedPackages) || profile.expectedPackages < 1 || names.some(name=>!name || name!==name.trim())) throw new Error('Invalid declared resource package list');
  if (new Set(names).size !== names.length || names.length !== profile.expectedPackages) throw new Error('Resource package count/order is invalid');
  for (const name of names) {
    if (!/^[\w.-]+\.jet$/i.test(name)) throw new Error('Unsafe package name');
    const candidates = [profile.env.BLUSTONE_PACKAGE_DIR, profile.env.BLUSTONE_RESOURCE_ASSET_DIR].map(dir => path.resolve(root, dir, name));
    if (!candidates.some(file => existsSync(file) && statSync(file).isFile())) throw new Error(`Missing ${name}. Import the pinned resource bundle; do not use a legacy fallback.`);
  }
  // Keep the existing E6 pin without modifying its profile bytes. New named
  // profiles declare their own coherent stamp, independently of server semver.
  const expectedStamp=profile.resourceStamp ?? (profile.name==='current-e6' ? '1634683' : undefined);
  if (typeof expectedStamp!=='string' || !/^[1-9][0-9]*$/.test(expectedStamp) ||
      !Number.isSafeInteger(Number(expectedStamp)) || Number(expectedStamp)>0x7fffffff) throw new Error('Invalid declared resource stamp');
  for (const key of ['BLUSTONE_RESOURCE_VERSION', 'BLUSTONE_RESLIST_STAMP', 'BLUSTONE_RESLIST_HEADER_STAMP']) {
    if (profile.env[key] !== expectedStamp) throw new Error(`Incoherent resource stamp: ${key}`);
  }
  if (!existsSync(path.resolve(root, profile.env.BLUSTONE_PACKAGE_TREE_DIR, 'UI_XML_RO.db', 'CURRENT'))) throw new Error('Active UI database tree missing');
  return names.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const profileIndex=process.argv.indexOf('--profile');
  const profileName=profileIndex===-1?'current-e6':process.argv[profileIndex+1];
  if (typeof profileName!=='string' || !/^[\w-]+$/.test(profileName)) throw new Error('Invalid profile name');
  const profile = JSON.parse(readFileSync(path.join(root, 'config/profiles',profileName+'.json'), 'utf8'));
  const count = preflight(root, profile);
  if (process.argv.includes('--hashes')) {
    const records = JSON.parse(readFileSync(path.join(root, 'resources/manifests/imported-files.json'), 'utf8'));
    for (const row of records) {
      const file = path.resolve(root, row.destination);
      if (statSync(file).size !== row.bytes || createHash('sha256').update(readFileSync(file)).digest('hex') !== row.sha256) throw new Error(`Changed imported input: ${row.destination}`);
    }
    console.log(`Verified ${records.length} imported files by SHA-256`);
  }
  console.log(`${profileName} resource preflight passed: ${count} packages`);
}
