$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$recordPath=Join-Path $taskRoot '.cache\local-runtime.json'
if(-not (Test-Path -LiteralPath $recordPath)){Write-Output 'No recorded runtime.';return}
$record=Get-Content -Raw -LiteralPath $recordPath|ConvertFrom-Json
foreach($name in @('rehaconnect','lightning','longo')){
    $processId=$record.$name
    if(-not $processId){continue}
    $details=Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
    if(-not $details){continue}
    if(-not $details.CommandLine.Contains($taskRoot)){throw "Refusing to stop a process outside this workspace: $processId"}
    Stop-Process -Id $processId
}
Remove-Item -LiteralPath $recordPath
Write-Output 'Stopped the recorded local runtime.'
