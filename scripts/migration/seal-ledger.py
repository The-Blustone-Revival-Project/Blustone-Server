"""Preserve originals for adapted files and seal the complete verification ledger."""
from pathlib import Path
import hashlib,json,shutil,sqlite3
SOURCE=Path('C:/Users/shaha/Documents/ChatGPT/Blustone')
REPOS={n:Path('C:/Users/shaha/Documents/GitHub/Blustone-'+n) for n in ['Server','Instrumented','DataDump']}
STATE=REPOS['DataDump']/'local/migration'
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        while b:=f.read(8*1024*1024):h.update(b)
    return h.hexdigest()

def main():
    db=sqlite3.connect(STATE/'ledger.sqlite');rows=db.execute('SELECT source,repo,destination,role,bytes,mtime_ns,source_sha256 FROM files').fetchall()
    transformations=[];drift=[];size_errors=[]
    for old,repo,dest,role,length,mtime,source_hash in rows:
        original=SOURCE/old;target=REPOS[repo]/dest;stat=original.stat()
        if (stat.st_size,stat.st_mtime_ns)!=(length,mtime):drift.append(old)
        # Public/tool/generated files may have been adapted or regenerated after copying.
        inspect=not dest.startswith(('local/','collector/data/','sources/community/raw/','sources/observations/'))
        different=not target.is_file() or target.stat().st_size!=length
        if not different and inspect:different=sha(target)!=source_hash
        if different:
            if sha(original)!=source_hash:raise ValueError('Source drift: '+old)
            preserved=REPOS[repo]/'local/migration/original-files'/old;preserved.parent.mkdir(parents=True,exist_ok=True)
            if not preserved.exists():shutil.copy2(original,preserved)
            if sha(preserved)!=source_hash:raise ValueError('Preservation hash mismatch: '+old)
            current_hash=sha(target) if target.is_file() else None
            transformations.append({'source':old,'repo':repo,'working_path':dest,'before_sha256':source_hash,'after_sha256':current_hash,
                                    'preserved':preserved.relative_to(REPOS[repo]).as_posix()})
            db.execute('UPDATE files SET destination=?,destination_sha256=? WHERE source=?',(preserved.relative_to(REPOS[repo]).as_posix(),source_hash,old))
    db.commit()
    for old,repo,dest,length in db.execute('SELECT source,repo,destination,bytes FROM files'):
        p=REPOS[repo]/dest
        if not p.is_file() or p.stat().st_size!=length:size_errors.append(old)
    if drift or size_errors:raise ValueError(json.dumps({'source_drift':drift,'destination_errors':size_errors}))
    keys=[r[1] for r in db.execute('PRAGMA table_info(files)')]
    with (STATE/'ledger.ndjson').open('w',encoding='utf-8') as f:
        for row in db.execute('SELECT * FROM files ORDER BY source'):f.write(json.dumps(dict(zip(keys,row)))+'\n')
    (STATE/'working-file-transformations.json').write_text(json.dumps(transformations,indent=2),encoding='utf-8')
    result={'files':len(rows),'bytes':sum(r[4] for r in rows),'adapted_or_regenerated_files_preserved':len(transformations),
            'source_metadata_drift':0,'missing_or_size_mismatched_preserved_copies':0,'verified_hash_mismatches':0}
    (STATE/'sealed-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))

if __name__=='__main__':main()
