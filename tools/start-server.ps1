# Canonical migrated launcher; current pinned profile replaces historical defaults.
& (Join-Path (Split-Path $PSScriptRoot -Parent) 'scripts/start-local.ps1') @args
