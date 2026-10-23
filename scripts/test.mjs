import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Keep separate processes and the curated suite order. A shell chain of the
// same entries exceeded Windows cmd.exe's8191-character command-line limit.
const root=fileURLToPath(new URL('../',import.meta.url));
const files=JSON.parse(readFileSync(new URL('../tests/suite.json',import.meta.url),'utf8'));
if(!Array.isArray(files)||!files.length||new Set(files).size!==files.length||files.some(file=>
 typeof file!=='string'||!/^tests\/[a-z0-9-]+\.ts$/.test(file)||!existsSync(path.join(root,file))))
 throw new Error('Invalid curated test suite');
for(const [index,file] of files.entries()) {
 console.log(`[${index+1}/${files.length}] ${file}`);
 const result=spawnSync(process.execPath,['--import','tsx',file],{cwd:root,stdio:'inherit',shell:false});
 if(result.error)throw result.error;
 if(result.status!==0){console.error(`Failed ${file}${result.signal?` (${result.signal})`:''}`);process.exit(result.status??1);}
}
console.log(`Passed ${files.length} test programs.`);
