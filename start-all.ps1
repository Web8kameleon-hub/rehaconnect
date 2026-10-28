param([string]$ConfigPath=(Join-Path $PSScriptRoot 'ports.json'))
$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'scripts\Start-Local.ps1') -ConfigPath $ConfigPath
