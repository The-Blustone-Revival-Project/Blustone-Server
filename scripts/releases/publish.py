"""Publish a reviewed semver server release; no draft/prerelease mode exists."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,subprocess,zipfile

ROOT=Path(__file__).resolve().parents[2]
REPO='The-Blustone-Revival-Project/Blustone-Server'
def run(*args,capture=False):
 return subprocess.check_output(args,cwd=ROOT,text=True).strip() if capture else subprocess.run(args,cwd=ROOT,check=True)
def sha(file):
 h=hashlib.sha256()
 with file.open('rb') as f:
  while b:=f.read(8*1024*1024):h.update(b)
 return h.hexdigest()

def prepare(resources):
 version=json.loads((ROOT/'package.json').read_text())['version'];lock=json.loads((ROOT/'package-lock.json').read_text())
 if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version):raise ValueError('Stable semver required')
 if lock['version']!=version or lock['packages']['']['version']!=version or (ROOT/'VERSION').read_text().strip()!=version:raise ValueError('Version files disagree')
 notes=ROOT/'releases'/f'{version}.md';text=notes.read_text(encoding='utf-8')
 if text.splitlines()[0]!='# Blustone Server '+version:raise ValueError('Release heading/version mismatch')
 sections=['Game features','Recovered game content','Current limitations','Getting started'] if version=='1.0.0' else ['Added','Improved','Fixed']
 if re.findall(r'^## (.+)$',text,re.M)!=sections:raise ValueError('Required public-facing sections: '+', '.join(sections))
 if re.search(r'^(?:#+\s*)?Validation\s*[:\n]',text,re.M|re.I):raise ValueError('Validation belongs in developer evidence, not public release notes')
 for section in sections:
  if not re.search(r'^## '+section+r'\n\n\S',text,re.M):raise ValueError('Empty '+section+' section')
 if not resources.is_file():raise ValueError('Resource bundle missing')
 if resources.stat().st_size>=2*1024**3:raise ValueError('Resource asset exceeds current per-asset limit')
 manifest=json.loads((ROOT/'resources/manifests/imported-files.json').read_text())
 with zipfile.ZipFile(resources) as z:
  if len(z.namelist())!=len(manifest) or set(z.namelist())!={r['destination'] for r in manifest}:raise ValueError('Resource ZIP contents do not match pinned manifest')
  for row in manifest:
   h=hashlib.sha256();length=0
   with z.open(row['destination']) as f:
    while b:=f.read(8*1024*1024):h.update(b);length+=len(b)
   if length!=row['bytes'] or h.hexdigest()!=row['sha256']:raise ValueError('Resource ZIP hash mismatch: '+row['destination'])
 out=ROOT/'local/releases'/version;out.mkdir(parents=True,exist_ok=True)
 archive=out/f'Blustone-Server-Resources-{version}.zip'
 if not archive.exists():shutil.copy2(resources,archive)
 if sha(archive)!=sha(resources):raise ValueError('Staged bundle differs')
 manifest=json.loads((ROOT/'resources/manifests/imported-files.json').read_text())
 release_manifest={'version':version,'resource_profile':'current-e6','resource_stamp':'1634683','expected_packages':139,
                   'bundle':{'name':archive.name,'bytes':archive.stat().st_size,'sha256':sha(archive)},'imported_files':manifest}
 (out/'RESOURCE-MANIFEST.json').write_text(json.dumps(release_manifest,indent=2)+'\n',encoding='utf-8')
 (out/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n' for p in [archive,out/'RESOURCE-MANIFEST.json']),encoding='utf-8')
 return version,notes,out

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--resources',type=Path,required=True);p.add_argument('--prepare-only',action='store_true');args=p.parse_args()
 version,notes,out=prepare(args.resources.resolve());tag='v'+version
 if args.prepare_only:print(json.dumps({'version':version,'directory':str(out),'title':'Blustone Server '+version}));return
 if run('git','status','--porcelain',capture=True):raise ValueError('Commit reviewed changes first')
 head=run('git','rev-parse','HEAD',capture=True)
 remote=run('git','ls-remote','origin','refs/heads/main',capture=True).split()[0]
 if remote!=head:raise ValueError('Push the reviewed source commit first')
 if run('git','ls-remote','origin','refs/tags/'+tag,capture=True):raise ValueError('Tag already exists; never reuse release versions')
 run('git','tag','-a',tag,'-m','Blustone Server '+version);run('git','push','origin',tag)
 assets=[str(out/f'Blustone-Server-Resources-{version}.zip'),str(out/'RESOURCE-MANIFEST.json'),str(out/'SHA256SUMS.txt')]
 run('gh','release','create',tag,*assets,'--repo',REPO,'--verify-tag','--title','Blustone Server '+version,
     '--notes-file',str(notes),'--draft=false','--prerelease=false','--latest')

if __name__=='__main__':main()
