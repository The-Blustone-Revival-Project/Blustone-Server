import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {repositoryPath} from '../src/paths.js';

const clean=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_')));
const file=repositoryPath('var/state.json'),before=existsSync(file)?readFileSync(file):undefined;
const compiled=import.meta.url.endsWith('.js');
for(const override of [{},{BLUSTONE_PACKAGE_NAMES:'   '},{BLUSTONE_PACKAGE_MODE:'pkgi1-tree'}]) {
  const result=spawnSync(process.execPath,[...(compiled?[]:['--import','tsx']),repositoryPath(compiled?'dist/src/server.js':'src/server.ts')],
    {cwd:repositoryPath(),env:{...clean,BLUSTONE_PORT:'0',...override},encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/No game resource profile/);
  assert.match(result.stderr,/npm run setup/);assert.match(result.stderr,/npm start/);
  assert.doesNotMatch(result.stdout,/listening/i,'Unconfigured command must not start a misleading minimal server');
}
if(before)assert.deepEqual(readFileSync(file),before);else assert.equal(existsSync(file),false);
// Importing the app for an explicit protocol test remains supported.
const {createApp}=await import('../src/server.js');
assert.equal(typeof createApp({baseUrl:'http://127.0.0.1'}).app,'function');
console.log('Startup resource profile: bare/partial executable configuration refuses with setup instructions before listening or state writes; programmatic protocol app remains supported.');
