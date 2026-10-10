param([int]$Port=8080, [string]$BindHost='0.0.0.0', [string]$BaseUrl='http://10.0.2.2:8080', [string]$StateFile='var/state.json', [switch]$Dev)
$ErrorActionPreference='Stop'
$serverRepoRoot=Split-Path $PSScriptRoot -Parent
$launchArguments=@((Join-Path $PSScriptRoot 'start-local.mjs'),'--port',"$Port",'--host',$BindHost,'--base-url',$BaseUrl,'--state-file',$StateFile)
if($Dev){$launchArguments+='--dev'}
& node @launchArguments
if($LASTEXITCODE -ne 0){throw "Server exited with code $LASTEXITCODE"}
