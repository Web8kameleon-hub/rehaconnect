$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$recordPath=Join-Path $taskRoot '.cache\local-runtime.json'
if(-not (Test-Path -LiteralPath $recordPath)){Write-Output 'No recorded runtime.';return}
$record=Get-Content -Raw -LiteralPath $recordPath|ConvertFrom-Json
$expected=@{
    frontend=(Join-Path $taskRoot 'frontend\rehaconnect-ui\server.cjs')
    rehaconnect=(Join-Path $taskRoot 'backend\rehaconnect-api\target\rehaconnect-api-1.0.0.jar')
    lightning=(Join-Path $taskRoot 'services\lightning-spp-3.14\source\bin\Debug\net10.0\wwwmmm.dll')
    longo=(Join-Path $taskRoot '.cache\longo-classes')
}
foreach($name in @('frontend','rehaconnect','lightning','longo')){
    $processId=$record.$name
    if(-not $processId){continue}
    $details=Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
    if(-not $details){continue}
    if(-not $details.CommandLine -or -not $details.CommandLine.Contains($expected[$name])){Write-Output "Skipped stale runtime process ID: $processId";continue}
    Stop-Process -Id $processId
}
Remove-Item -LiteralPath $recordPath
Write-Output 'Stopped the recorded local runtime.'
