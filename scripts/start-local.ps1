param([int]$Port=8080, [string]$BindHost='0.0.0.0', [string]$BaseUrl='http://10.0.2.2:8080', [string]$StateFile='var/state.json', [ValidatePattern('^[\w-]+$')][string]$Profile='current-e6', [switch]$Dev, [switch]$ResourceSnapshot, [ValidateSet('legacy','local-linear-100')][string]$TeamLevelProfile)
$ErrorActionPreference='Stop'
$serverRepoRoot=Split-Path $PSScriptRoot -Parent
$launchArguments=@((Join-Path $PSScriptRoot 'start-local.mjs'),'--profile',$Profile,'--port',"$Port",'--host',$BindHost,'--base-url',$BaseUrl,'--state-file',$StateFile)
if($Dev){$launchArguments+='--dev'}
if($ResourceSnapshot){$launchArguments+='--resource-snapshot'}
if($TeamLevelProfile){$launchArguments+=@('--team-level-profile',$TeamLevelProfile)}
& node @launchArguments
if($LASTEXITCODE -ne 0){throw "Server exited with code $LASTEXITCODE"}
