import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { preflight } from './resources/verify.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const profileName = option('--profile', 'current-e6');
if (!/^[\w-]+$/.test(profileName)) throw new Error('Invalid profile name');
const profile = JSON.parse(readFileSync(path.join(root, 'config/profiles', profileName + '.json'), 'utf8'));
const env = { ...process.env, ...profile.env };
for (const key of ['BLUSTONE_PACKAGE_DIR', 'BLUSTONE_PACKAGE_TREE_DIR', 'BLUSTONE_UI_PACKAGE_TREE_DIR', 'BLUSTONE_RESOURCE_ASSET_DIR', 'BLUSTONE_STATE_FILE', 'BLUSTONE_CATALOG_PATH']) {
  if (env[key]) env[key] = path.resolve(root, env[key]);
}
env.BLUSTONE_PORT = option('--port', process.env.BLUSTONE_PORT ?? '8080');
env.BLUSTONE_BIND_HOST = option('--host', process.env.BLUSTONE_BIND_HOST ?? env.BLUSTONE_BIND_HOST);
env.BLUSTONE_BASE_URL = option('--base-url', process.env.BLUSTONE_BASE_URL ?? env.BLUSTONE_BASE_URL);
env.BLUSTONE_STATE_FILE = path.resolve(root, option('--state-file', env.BLUSTONE_STATE_FILE));
// Profile defaults normally override inherited environment. This explicit
// operator choice selects the existing LOCAL paid-recruitment target; the
// server still requires a published ordinary reference and actual payment.
if (args.includes('--recruit-card')) {
  const recruitCard = option('--recruit-card');
  if (!/^\d{3}$/.test(recruitCard ?? '') || ['000', '001'].includes(recruitCard))
    throw new Error('--recruit-card requires a three-digit non-main ordinary Hunter ID');
  env.BLUSTONE_RECRUIT_CARD = recruitCard;
}
preflight(root, profile);
mkdirSync(path.dirname(env.BLUSTONE_STATE_FILE), { recursive: true });
console.log(`Profile ${profileName}: ${profile.expectedPackages} packages, version ${env.BLUSTONE_RESOURCE_VERSION}, port ${env.BLUSTONE_PORT}`);
const command = args.includes('--dev') ? ['--import', 'tsx', path.join(root, 'src/server.ts')] : [path.join(root, 'dist/src/server.js')];
const child = spawn(process.execPath, command, { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.once('error', error => { console.error(error); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
