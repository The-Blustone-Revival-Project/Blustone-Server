"""Check Git-visible migration candidates without printing possible secret values."""
from pathlib import Path
import ast,json,re,subprocess

REPOS={name:Path('C:/Users/shaha/Documents/GitHub/Blustone-'+name) for name in ['Server','Instrumented','DataDump']}
patterns={
    'assigned-account-secret':re.compile(r'''["'](?:otp|vs_token|accessToken|refresh_token|private_key|password)["']\s*:\s*["']([^"'\n]{12,})["']''',re.I),
    'private-key-material':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
}
report=[];checked=0;syntax=[]
for name,repo in REPOS.items():
    visible=subprocess.check_output(['git','-C',str(repo),'ls-files','--cached','--others','--exclude-standard','-z']).decode('utf-8').split('\0')
    for relative in set(visible):
        if not relative:continue
        file=repo/relative
        if not file.is_file():continue
        if relative.startswith(('local/','var/','collector/data/')) and relative!='collector/data/.gitkeep':raise SystemExit('Private candidate visible: '+name+'/'+relative)
        if file.suffix.lower() not in ['.md','.py','.ts','.mjs','.js','.json','.yaml','.yml','.ps1','.txt','.tsv','.csv','.java']:continue
        try:text=file.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError:continue
        checked+=1
        for kind,pattern in patterns.items():
            if pattern.search(text):report.append({'repository':name,'path':relative,'kind':kind})
        if file.suffix=='.py':
            try:ast.parse(text,filename=relative)
            except SyntaxError as error:syntax.append({'repository':name,'path':relative,'line':error.lineno,'message':error.msg})
output={'text_candidates_checked':checked,'possible_secret_files':report,'python_syntax_errors':syntax,
        'note':'Pattern audit only; private/raw captures stay ignored. Source history is preserved locally and has not been selected for publication.'}
target=REPOS['Server']/'local/public-file-audit.json';target.write_text(json.dumps(output,indent=2),encoding='utf-8')
print(json.dumps({'text_candidates_checked':checked,'possible_secret_files':len(report),'python_syntax_errors':syntax}))
if report:print(json.dumps(report))
raise SystemExit(1 if syntax or report else 0)
