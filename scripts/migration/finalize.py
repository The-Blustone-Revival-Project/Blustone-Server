"""Finish DataDump indexing/link migration after the copy ledger is complete.

Moves only newly copied destination files. Original workspace is read-only.
Every edited document's original bytes remain in ignored preservation storage.
"""
from pathlib import Path
import hashlib, importlib.util, json, os, posixpath, re, sqlite3, subprocess
from urllib.parse import unquote

SCRIPT=Path(__file__).with_name('copy-workspace.py')
spec=importlib.util.spec_from_file_location('migration_copy',SCRIPT)
copy=importlib.util.module_from_spec(spec);spec.loader.exec_module(copy)
SOURCE=copy.SOURCE;REPOS=copy.REPOS;ROOT=REPOS['DataDump'];STATE=ROOT/'local/migration'
def sha(data): return hashlib.sha256(data).hexdigest()

def main():
    db=sqlite3.connect(STATE/'ledger.sqlite')
    unfinished=db.execute("SELECT COUNT(*) FROM files WHERE status NOT LIKE 'verified%'").fetchone()[0]
    if unfinished:raise SystemExit(f'{unfinished} files are not verified; refuse finalization')
    if not (STATE/'summary.json').exists():raise SystemExit('Copy is still running; refuse finalization')
    rows=list(db.execute('SELECT source,repo,destination,role,source_sha256 FROM files'))
    mapping={old:(repo,dest) for old,repo,dest,role,h in rows}
    relocation=[]
    # The native flat dump becomes a system-indexed evidence library.
    for old,repo,dest,role,h in rows:
        if repo!='DataDump' or role!='native-evidence' or not dest.startswith('sources/native/'):continue
        p=ROOT/dest
        if not p.exists():continue
        name=p.name
        category='strings' if 'strings' in name else 'symbols' if 'evidence' in name or 'symbol' in name else copy.system(name)
        target=ROOT/'sources/native'/category/name;target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists() and sha(target.read_bytes())!=sha(p.read_bytes()):raise ValueError('Native collision: '+str(target))
        if p!=target:p.replace(target)
        new=target.relative_to(ROOT).as_posix();mapping[old]=(repo,new)
        db.execute('UPDATE files SET destination=? WHERE source=?',(new,old));relocation.append({'source':old,'destination':new})
    # All source paths, including conflict snapshots, remain reachable through the ledger.
    for old,repo,dest,role,h in rows:
        if role=='native-evidence' and old in mapping:continue
        if 'local/migration/conflicts/' in dest or 'local/migration/original-documents/' in dest:
            owner,preferred,_=copy.owner(Path(old));preferred=preferred.as_posix()
            if (REPOS[owner]/preferred).exists():mapping[old]=(owner,preferred)
    transformed=[];resolved=0;unresolved=[]
    for old,repo,dest,role,h in rows:
        if repo!='DataDump' or Path(old).suffix.lower()!='.md' or role not in ['research-evidence','catalogue','dataset','recovered-table']:continue
        owner,newpath=mapping[old];p=REPOS[owner]/newpath
        if not p.exists():continue
        raw=(SOURCE/old).read_bytes()
        try:text=raw.decode('utf-8-sig')
        except UnicodeDecodeError:continue
        def link(match):
            nonlocal resolved
            url=match.group(1).strip();wrapped=url.startswith('<') and url.endswith('>');url=url.strip('<>')
            if re.match(r'^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#)',url):return match.group(0)
            base,sep,anchor=url.partition('#')
            # Markdown titles are not path tokens.
            if ' "' in base:base=base.split(' "',1)[0]
            base=unquote(base).replace('\\','/')
            candidates=[posixpath.normpath(posixpath.join(posixpath.dirname(old),base)),posixpath.normpath(base)]
            found=next((mapping[c] for c in candidates if c in mapping),None)
            if not found:
                # Directory links also map to the new organized evidence tree.
                prefix=next((c.rstrip('/')+'/' for c in candidates if any(k.startswith(c.rstrip('/')+'/') for k in mapping)),None)
                if prefix:
                    targets=[(r,d) for k,(r,d) in mapping.items() if k.startswith(prefix)]
                    owners={r for r,d in targets}
                    if len(owners)==1:
                        owner=targets[0][0];dirs=[str((REPOS[r]/d).parent) for r,d in targets]
                        found=(owner,Path(os.path.commonpath(dirs)).relative_to(REPOS[owner]).as_posix())
            if not found and Path(base).suffix.lower() in ['.md','.json','.tsv','.csv']:
                # Repair a pre-existing wrong relative depth only for a unique exact filename.
                exact=[target for source,target in mapping.items() if posixpath.basename(source)==posixpath.basename(base)]
                if len(exact)==1:found=exact[0]
            if found:
                r,d=found;target=REPOS[r]/d
                relative=os.path.relpath(target,p.parent).replace('\\','/')
                if ' ' in relative:relative='<'+relative+(sep+anchor if sep else '')+'>'
                else:relative+=sep+anchor if sep else ''
                resolved+=1;return ']('+relative+')'
            # Existing local links may be added by later documentation edits.
            if not (p.parent/base).exists():unresolved.append({'document':newpath,'legacy_link':url})
            return match.group(0)
        # Exclude code blocks/inline code from Markdown link detection.
        masked=re.sub(r'```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`',lambda m:' '*len(m.group(0)),text)
        edits=[]
        for match in re.finditer(r'\[[^\]\n]+\]\(([^\n)]+)\)',masked):
            # The replacement callback operates on the closing bracket + target only.
            target_start=masked.index('](',match.start(),match.end())
            closing=re.match(r'\]\(([^\n)]+)\)',text[target_start:match.end()])
            edits.append((target_start,match.end(),link(closing)))
        updated=text
        for a,b,value in reversed(edits):updated=updated[:a]+value+updated[b:]
        if updated!=text:
            preserved=ROOT/'local/migration/original-documents'/old;preserved.parent.mkdir(parents=True,exist_ok=True)
            if not preserved.exists():preserved.write_bytes(raw)
            p.write_text(updated,encoding='utf-8')
            transformed.append({'source':old,'destination':newpath,'before_sha256':sha(raw),'after_sha256':sha(p.read_bytes()),'preserved':preserved.relative_to(ROOT).as_posix()})
            # The verified-copy ledger points to unchanged bytes; the path map points to edited docs.
            if sha(raw)==h:db.execute('UPDATE files SET destination=? WHERE source=?',(preserved.relative_to(ROOT).as_posix(),old))
    # Adapt native paths in research scripts to the grouped final destinations.
    for p in (ROOT/'tools').rglob('*.py'):
        if 'normalize' in p.parts:continue
        text=p.read_text(encoding='utf-8-sig');new=text
        for entry in relocation:
            original='sources/native/'+Path(entry['source']).name
            new=new.replace(original,entry['destination'])
        if new!=text:p.write_text(new,encoding='utf-8')
    db.commit()
    public=[]
    for old,(repo,dest) in sorted(mapping.items()):
        if dest.startswith('local/') or dest.startswith(('sources/observations/','sources/community/raw/','collector/data/','resources/runtime/')):continue
        public.append({'source':old,'repository':'Blustone-'+repo,'destination':dest})
    (ROOT/'manifests').mkdir(exist_ok=True)
    (ROOT/'manifests/legacy-path-map.json').write_text(json.dumps(public,indent=2)+'\n',encoding='utf-8')
    (STATE/'full-path-map.json').write_text(json.dumps(mapping,indent=2),encoding='utf-8')
    (STATE/'document-transformations.json').write_text(json.dumps(transformed,indent=2),encoding='utf-8')
    (ROOT/'manifests/link-migration-report.json').write_text(json.dumps({'rewritten_links':resolved,'edited_documents':len(transformed),
      'unresolved_legacy_links':unresolved,'note':'Unresolved links are preserved historical references; source bytes remain archived. They require evidence recovery, not fabricated targets.'},indent=2),encoding='utf-8')
    # Add Git-state classification without publishing private paths.
    tracked=set(subprocess.check_output(['git','-C',str(SOURCE),'ls-files'],text=True).splitlines())
    changes={line[3:]:line[:2] for line in subprocess.check_output(['git','-C',str(SOURCE),'status','--porcelain','-uall'],text=True).splitlines()}
    columns=[r[1] for r in db.execute('PRAGMA table_info(files)')]
    if 'git_state' not in columns:db.execute('ALTER TABLE files ADD COLUMN git_state TEXT')
    for (old,) in db.execute('SELECT source FROM files').fetchall():
        state=changes.get(old,'tracked-clean' if old in tracked else 'ignored-or-untracked')
        db.execute('UPDATE files SET git_state=? WHERE source=?',(state,old))
    db.commit()
    (STATE/'native-relocations.json').write_text(json.dumps(relocation,indent=2),encoding='utf-8')
    result={'native_evidence_files_organized':len(relocation),'public_path_map_entries':len(public),'edited_documents':len(transformed),
            'rewritten_links':resolved,'unresolved_historical_links':len(unresolved)}
    (STATE/'finalization.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))

if __name__=='__main__':main()
