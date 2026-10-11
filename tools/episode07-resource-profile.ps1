# Resource selection now belongs to named Server JSON profiles.
# This compatibility entry point prepares an INACTIVE profile only; no environment
# changes, server restart, save edits, APK work or progression grants occur.
param([switch]$InspectOnly)
$ErrorActionPreference='Stop'
$episode07ServerRoot=Split-Path $PSScriptRoot -Parent
$episode07Arguments=@((Join-Path $episode07ServerRoot 'scripts/profiles/prepare-e7.mjs'))
if($InspectOnly){$episode07Arguments+='--inspect-only'}
& node @episode07Arguments
if($LASTEXITCODE -ne 0){throw 'E7 named-profile preparation refused; live selection is unchanged'}
