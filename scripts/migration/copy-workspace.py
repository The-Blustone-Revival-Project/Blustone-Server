"""Copy the legacy workspace without deleting or overwriting differing files.

Full SHA256 verification, restartable SQLite ledger, explicit owner mapping.
Private/bulk material stays in ignored local/ directories inside its owner repo.
"""
from pathlib import Path
import concurrent.futures as cf
import hashlib, json, os, shutil, sqlite3, subprocess, time

SOURCE = Path('C:/Users/shaha/Documents/ChatGPT/Blustone')
REPOS = {name: Path('C:/Users/shaha/Documents/GitHub/Blustone-' + name) for name in ['Server','Instrumented','DataDump']}
STATE = REPOS['DataDump'] / 'local/migration'
STATE.mkdir(parents=True, exist_ok=True)

def system(name):
    n = name.lower()
    for key, words in [
        ('hunters', ['hunter','card','roster','stat','skill','rage','stun','aura','combat','buff','heal','attack','exchange','battle']),
        ('campaign', ['campaign','stage','area','mission','map','achievement','progress']),
        ('episodes', ['episode','dialogue','story']),
        ('economy', ['shop','reward','supply','login','attendance','coupon','gacha','recruit','capsule','gem','item','mail','fuel','gold','currency']),
        ('equipment', ['equipment','jewel','weapon','armor']),
        ('systems', ['arena','fishing','mirage','training','social','guild','fight-club']),
        ('resources', ['resource','cdn','bootstrap','leveldb','ui-','render','color','asset','package','seed']),
        ('protocol', ['route','network','protocol','server','crypto','account','auth','launcher','reference','request','response'])]:
        if any(word in n for word in words): return key
    return 'revival'

def owner(rel):
    parts = rel.parts; top=parts[0]; sub=parts[1] if len(parts)>1 else ''; tail=Path(*parts[1:]); ext=rel.suffix.lower()
    if top == '.git': return 'DataDump', Path('local/migration/legacy-git')/tail, 'private-history'
    if top == '.cursor': return 'DataDump', Path('local/migration/workspace-guidance')/tail, 'private-guidance'
    if top == 'server-ts':
        if sub in ['node_modules','dist','logs','data','recovered-assets','server-ts','analysis']:
            return 'Server', Path('local/legacy-server')/tail, 'private-runtime' if sub in ['data','logs','recovered-assets','server-ts'] else 'generated'
        if sub == 'README.md': return 'Server', Path('docs/legacy-server-README.md'), 'documentation'
        return 'Server', tail, 'server-source'
    if top == 'instrumentation':
        if sub == 'collector': return 'Instrumented', Path(*parts[1:]), 'private-telemetry' if len(parts)>2 and parts[2]=='data' else 'collector-source'
        if sub == 'docker-compose.yml': return 'Instrumented', Path('docs/legacy/docker-compose.yml'), 'documentation'
        if sub == 'README.md': return 'Instrumented', Path('docs/legacy/instrumentation-README.md'), 'documentation'
        return 'Instrumented', tail, 'client-source'
    if top == 'recovered-assets':
        if sub.startswith(('forum-en','vsfan-reward','login-bonus','community-notes','apk-archive-hunt')):
            return 'DataDump', Path('sources/community/raw')/tail, 'unreviewed-public-source'
        return 'DataDump', Path('local/private/recovered-assets')/tail, 'private-preservation'
    if top == 'tools':
        if sub in ['android-sdk','jdk','ghidra','jadx','jadx-tmp','python-venv','apktool','frida-server','downloads']:
            return 'Instrumented', Path('local/toolchains')/tail, 'toolchain'
        if sub.endswith('-resource-profile.ps1') or sub.startswith(('start-server','prepare-reconstructed','prepare-runtime','build-local-map-wrapper','build-episode-ui-delta','build-cdn-compression')):
            return 'Server', Path('tools')/Path(*parts[1:]), 'server-tool'
        if sub.startswith(('forum-','login-bonus-','vsfan-','campaign-reward-')):
            return 'DataDump', Path('tools/community')/Path(*parts[1:]), 'research-tool'
        if sub == 'jet-viewer' or sub == 'research' or sub.startswith(('extract-','export-recovered','find-bl-','find-missing-ui','collect-ui','check-text','disasm','dump-ui','debug-leveldb','patch-leveldb','rebuild-leveldb','scan-')):
            return 'DataDump', Path('tools/extract')/Path(*parts[1:]), 'research-tool'
        return 'Instrumented', Path('tools')/tail, 'generated' if sub in ['__pycache__'] or ext in ['.o','.pyc'] else 'client-tool'
    if top == 'analysis':
        if sub == 'recovered-reference': return 'DataDump', Path('sources/client-tables/reference')/Path(*parts[2:]), 'recovered-table'
        if sub == 'recovered-data': return 'DataDump', Path('sources/client-tables/recovered-data')/Path(*parts[2:]), 'recovered-table'
        if sub == 'catalogue':
            section=parts[2] if len(parts)>2 else ''
            if section=='stats' and len(parts)>3 and parts[3]=='GEAR.md': return 'DataDump', Path('datasets/equipment/GEAR.md'), 'dataset'
            targets={'cards':'datasets/hunters/catalogue','monsters':'datasets/monsters/catalogue','stats':'datasets/hunters/observed-stats','data':'catalog/legacy-catalogue-data'}
            if section in targets: return 'DataDump', Path(targets[section])/Path(*parts[3:]), 'dataset'
            return 'DataDump', Path('catalog')/Path(*parts[2:]), 'catalogue'
        if sub in ['research','systems']:
            if ext in ['.md','.tsv','.csv','.json','.txt','.py'] and '__pycache__' not in parts:
                name = parts[2] if len(parts)>2 else sub
                return 'DataDump', Path('findings')/system(name)/Path(*parts[2:]), 'research-evidence'
            return 'DataDump', Path('sources/observations/research')/Path(*parts[2:]), 'unreviewed-observation'
        if sub in ['ghidra-script','ghidra-scripts']: return 'DataDump', Path('tools/extract')/sub/Path(*parts[2:]), 'research-tool'
        if sub == 'VSFan': return 'DataDump', Path('sources/community/raw/VSFan')/Path(*parts[2:]), 'unreviewed-public-source'
        if sub in ['testing','capture','battle-scene','exchange-ui','card-stat-ui-probe','in-game-stats','ui-episode-native-reader-check'] or sub.startswith('r0'):
            return 'DataDump', Path('sources/observations')/tail, 'unreviewed-observation'
        if sub.startswith(('native-','ghidra-')) and len(parts)==2:
            return 'DataDump', Path('sources/native')/sub, 'native-evidence'
        if sub.startswith(('runtime-package','reconstructed-resource','reconstructed-ui')):
            return 'Server', Path('local/legacy-resources')/tail, 'runtime-material'
        if sub in ['patched','extracted','instrumented-apk'] or sub.startswith(('patched-','instrumented-ui-seed','seed-ui','ui-db-full','blustone-','cdn-compression-repair','episode-ui-delta','generated-map-wrapper','rapid-touch','input-probe')):
            return 'Instrumented', Path('local/legacy-analysis')/tail, 'build-material'
        if len(parts)==2 and ext=='.md': return 'DataDump', Path('findings/revival')/sub, 'research-evidence'
        return 'DataDump', Path('local/archive/analysis')/tail, 'preservation'
    return 'DataDump', Path('local/migration/legacy-root')/rel, 'private-guidance' if top=='AGENTS.md' else 'preservation'

def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        while block:=f.read(8*1024*1024): h.update(block)
    return h.hexdigest()

def copy_one(row):
    old, repo, new, role, length, mtime = row
    src=SOURCE/old; dest=REPOS[repo]/new
    try:
        before=src.stat(); dest.parent.mkdir(parents=True,exist_ok=True)
        sh=digest(src)
        status='verified'
        if dest.exists():
            if dest.is_file() and dest.stat().st_size==length and digest(dest)==sh: return (*row, sh, sh, 'verified-existing', '')
            dest=REPOS[repo]/'local/migration/conflicts'/old
            dest.parent.mkdir(parents=True,exist_ok=True); new=str(dest.relative_to(REPOS[repo])).replace('\\','/'); status='verified-conflict-preserved'
        shutil.copy2(src,dest)
        dh=digest(dest); after=src.stat()
        if dh!=sh: raise ValueError('destination hash mismatch')
        if before.st_size!=after.st_size or before.st_mtime_ns!=after.st_mtime_ns: status='source-changed'
        return (old,repo,new,role,length,mtime,sh,dh,status,'')
    except Exception as exc: return (*row,'','','error',str(exc))

def main():
    db=sqlite3.connect(STATE/'ledger.sqlite'); db.execute('PRAGMA journal_mode=WAL')
    db.execute('CREATE TABLE IF NOT EXISTS files (source TEXT PRIMARY KEY, repo TEXT, destination TEXT, role TEXT, bytes INTEGER, mtime_ns INTEGER, source_sha256 TEXT, destination_sha256 TEXT, status TEXT, error TEXT)')
    files=[]; links=[]
    for root,dirs,names in os.walk(SOURCE,followlinks=False):
        for d in dirs[:]:
            p=Path(root)/d
            if p.is_symlink() or p.is_junction(): dirs.remove(d); links.append(str(p.relative_to(SOURCE)))
        for name in names:
            p=Path(root)/name; rel=p.relative_to(SOURCE)
            if p.is_symlink(): links.append(str(rel)); continue
            repo,dest,role=owner(rel); st=p.stat()
            files.append((rel.as_posix(),repo,dest.as_posix(),role,st.st_size,st.st_mtime_ns))
    (STATE/'links.json').write_text(json.dumps(links,indent=2))
    existing={r[0]:(r[1],r[2],r[3]) for r in db.execute('SELECT source,bytes,mtime_ns,status FROM files')}
    pending=[r for r in files if r[0] not in existing or existing[r[0]][:2]!=(r[4],r[5]) or not existing[r[0]][2].startswith('verified')]
    print(json.dumps({'event':'inventory','files':len(files),'bytes':sum(r[4] for r in files),'pending':len(pending),'links':links}),flush=True)
    # Small source files first makes implementation work available while bulk copies run.
    pending.sort(key=lambda r:(r[4]>16*1024*1024,r[4]))
    started=time.time(); done=0; last=started
    with cf.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(copy_one,r):r for r in pending}
        for future in cf.as_completed(futures):
            result=future.result(); db.execute('INSERT OR REPLACE INTO files (source,repo,destination,role,bytes,mtime_ns,source_sha256,destination_sha256,status,error) VALUES (?,?,?,?,?,?,?,?,?,?)',result);done+=1
            if done%100==0: db.commit()
            now=time.time()
            if now-last>20:
                db.commit(); summary=list(db.execute('SELECT status,COUNT(*),SUM(bytes) FROM files GROUP BY status'))
                print(json.dumps({'event':'progress','done':done,'pending':len(pending),'elapsed_s':round(now-started),'summary':summary}),flush=True);last=now
    db.commit()
    with (STATE/'ledger.ndjson').open('w',encoding='utf-8') as f:
        keys=['source','repo','destination','role','bytes','mtime_ns','source_sha256','destination_sha256','status','error']
        for row in db.execute('SELECT * FROM files ORDER BY source'): f.write(json.dumps(dict(zip(keys,row)))+'\n')
    summary={'source_files':len(files),'source_bytes':sum(r[4] for r in files),'elapsed_s':round(time.time()-started),'statuses':list(db.execute('SELECT status,COUNT(*),SUM(bytes) FROM files GROUP BY status')),'owners':list(db.execute('SELECT repo,COUNT(*),SUM(bytes) FROM files GROUP BY repo')),'links':links}
    (STATE/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({'event':'complete',**summary}),flush=True)
    bad=db.execute("SELECT COUNT(*) FROM files WHERE status NOT LIKE 'verified%'").fetchone()[0]
    return 1 if bad or links else 0

if __name__=='__main__': raise SystemExit(main())
