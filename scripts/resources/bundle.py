"""Export/import the pinned local resource bundle; safe paths and full hash checks."""
import argparse, hashlib, json, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        while block:=f.read(8*1024*1024):h.update(block)
    return h.hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['export','import'])
    parser.add_argument('archive',type=Path)
    args=parser.parse_args()
    records=json.loads((ROOT/'resources/manifests/imported-files.json').read_text(encoding='utf-8'))
    wanted={r['destination']:r for r in records}
    if args.mode=='export':
        args.archive.parent.mkdir(parents=True,exist_ok=True)
        if args.archive.exists():raise SystemExit('Refusing to overwrite bundle')
        with zipfile.ZipFile(args.archive,'w',compression=zipfile.ZIP_STORED,allowZip64=True) as z:
            for name,row in wanted.items():
                file=ROOT/name
                if sha(file)!=row['sha256']:raise SystemExit('Input hash mismatch: '+name)
                z.write(file,name)
    else:
        with zipfile.ZipFile(args.archive) as z:
            if set(z.namelist())!=set(wanted):raise SystemExit('Bundle contents differ from pinned manifest')
            for name,row in wanted.items():
                dest=(ROOT/name).resolve()
                if not dest.is_relative_to(ROOT.resolve()):raise SystemExit('Unsafe bundle path')
                data=z.read(name)
                if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']:raise SystemExit('Bundle hash mismatch: '+name)
                if dest.exists() and sha(dest)!=row['sha256']:raise SystemExit('Refusing to replace different input: '+name)
                dest.parent.mkdir(parents=True,exist_ok=True)
                if not dest.exists():dest.write_bytes(data)
    print(f'{args.mode}: {len(wanted)} verified files; bundle SHA256 {sha(args.archive)}')

if __name__=='__main__':main()
