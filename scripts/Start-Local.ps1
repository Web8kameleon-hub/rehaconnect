param(
    [ValidateRange(4800,4900)][int]$Port=4800,
    [ValidateRange(4800,4900)][int]$LightningPort=4801,
    [ValidateRange(4800,4900)][int]$LongoPort=4802
)
$ErrorActionPreference='Stop'
if(@($Port,$LightningPort,$LongoPort | Select-Object -Unique).Count -ne 3){throw 'RehaConnect, Lightning and Longo require three different ports in 4800-4900.'}
$taskRoot=Split-Path -Parent $PSScriptRoot
$cache=Join-Path $taskRoot '.cache'
$source=Join-Path $taskRoot 'services\lightning-spp-3.14\source'
$sdk=Join-Path $cache 'dotnet\dotnet.exe'
if(-not (Test-Path -LiteralPath $sdk)){$sdk=(Get-Command dotnet).Source}
$lightningDll=Join-Path $source 'bin\Debug\net10.0\wwwmmm.dll'
$jar=Join-Path $taskRoot 'backend\rehaconnect-api\target\rehaconnect-api-1.0.0.jar'
foreach($artifact in @($lightningDll,$jar)){if(-not (Test-Path -LiteralPath $artifact)){throw "Build the required artifact first: $artifact"}}
foreach($listenPort in @($Port,$LightningPort,$LongoPort)){
    if(Get-NetTCPConnection -LocalPort $listenPort -State Listen -ErrorAction SilentlyContinue){throw "Port $listenPort is already in use; no process was stopped."}
}
foreach($environmentName in @('LSPP_ENVIRONMENT','DOTNET_ENVIRONMENT','ASPNETCORE_ENVIRONMENT')){
    if([Environment]::GetEnvironmentVariable($environmentName) -eq 'Production'){throw 'This launcher is for a separate local development runtime.'}
}
New-Item -ItemType Directory -Force $cache | Out-Null
$classes=Join-Path $cache 'longo-classes'
New-Item -ItemType Directory -Force $classes | Out-Null
$sources=Get-ChildItem (Join-Path $source 'Persistence\Longo\src\main\java') -Filter '*.java' -Recurse | ForEach-Object FullName
& javac --add-modules jdk.httpserver -d $classes $sources
if($LASTEXITCODE -ne 0){throw 'Java Longo build failed; JDK 21+ is required.'}
$localData=Join-Path $taskRoot 'data\local'
New-Item -ItemType Directory -Force $localData | Out-Null
$settings=@{
    LONGO_HOST='127.0.0.1';LONGO_PORT="$LongoPort";LONGO_STORAGE_PATH=(Join-Path $localData 'lightning-longo.bin');
    LONGO_URL="http://127.0.0.1:$LongoPort";LSPP_DATA_DIR=(Join-Path $localData 'lightning');LSPP_BIND_HOST='localhost';
    LSPP_PUBLIC_ORIGIN="http://127.0.0.1:$Port";LIGHTNING_INTERNAL_URL="http://localhost:$LightningPort";
    REHACONNECT_PUBLIC_URL="http://127.0.0.1:$Port";REHACONNECT_STORAGE_PATH=(Join-Path $localData 'clinics.bin');
    REHACONNECT_PRODUCTION='false'
}
$previous=@{};$started=@()
function Wait-Ready($Url,$Process){
    for($attempt=0;$attempt -lt 120;$attempt++){
        if($Process.HasExited){throw "A local process exited before readiness. Check logs under $cache."}
        try{$null=Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 1;return}catch{Start-Sleep -Milliseconds 150}
    }
    throw "Readiness timed out: $Url"
}
try{
    foreach($key in $settings.Keys){$previous[$key]=[Environment]::GetEnvironmentVariable($key);[Environment]::SetEnvironmentVariable($key,$settings[$key],'Process')}
    $longo=Start-Process java -ArgumentList @('--add-modules','jdk.httpserver','-cp',$classes,'com.clisonix.longo.LongoServer') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $cache 'longo.log') -RedirectStandardError (Join-Path $cache 'longo-error.log')
    $started+=$longo;Wait-Ready "http://127.0.0.1:$LongoPort/health" $longo
    $lightning=Start-Process $sdk -ArgumentList @($lightningDll,'serve',"$LightningPort") -WorkingDirectory $source -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $cache 'lightning.log') -RedirectStandardError (Join-Path $cache 'lightning-error.log')
    $started+=$lightning;Wait-Ready "http://localhost:$LightningPort/api/health" $lightning
    $api=Start-Process java -ArgumentList @('-jar',$jar,"--server.port=$Port",'--debug=false','--logging.level.root=WARN') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $cache 'rehaconnect.log') -RedirectStandardError (Join-Path $cache 'rehaconnect-error.log')
    $started+=$api;Wait-Ready "http://127.0.0.1:$Port/" $api
    @{longo=$longo.Id;lightning=$lightning.Id;rehaconnect=$api.Id;url="http://127.0.0.1:$Port";ports=@{rehaconnect=$Port;lightning=$LightningPort;longo=$LongoPort}}|ConvertTo-Json|Set-Content -Encoding utf8 (Join-Path $cache 'local-runtime.json')
    Write-Output "RehaConnect ready: http://127.0.0.1:$Port"
    Write-Output 'No accounts, clinics, plans or payments were created by startup.'
}catch{
    foreach($process in $started){if(-not $process.HasExited){Stop-Process -Id $process.Id}}
    throw
}finally{
    foreach($key in $previous.Keys){[Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')}
}
