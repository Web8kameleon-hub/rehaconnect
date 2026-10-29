param([string]$Image='rehaconnect:validation-20261029',[ValidateRange(4100,4199)][int]$Port=4180)
$ErrorActionPreference='Stop'
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){throw "Test port $Port is occupied; no process was stopped."}
$containerName='rehaconnect-smoke-'+[guid]::NewGuid().ToString('N').Substring(0,12)
try{
    & docker run --detach --name $containerName --publish "127.0.0.1:${Port}:4101" --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /tmp:rw,noexec,nosuid,size=128m --tmpfs /app/data:rw,uid=10001,gid=10001,size=32m -e REHACONNECT_PRODUCTION=true -e REHACONNECT_PUBLIC_URL=https://validation.invalid -e LIGHTNING_INTERNAL_URL=http://127.0.0.1:9 -e SERVER_SERVLET_SESSION_COOKIE_SECURE=true $Image | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Docker container could not start.'}
    $ready=$false
    for($attempt=0;$attempt -lt 120;$attempt++){
        try{$null=Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 1;$ready=$true;break}catch{Start-Sleep -Milliseconds 250}
    }
    if(-not $ready){throw 'Container HTTP readiness failed.'}
    foreach($asset in @('/','/assistant.js','/assistant.css')){
        $response=Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port$asset" -TimeoutSec 5
        if($response.StatusCode -ne 200){throw "Asset failed: $asset"}
        Write-Output "PASS container $asset -> 200"
    }
    foreach($check in @(@('/api/clinics',401),@('/api/assistant',503))){
        try{$response=Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port$($check[0])" -TimeoutSec 8;$actual=[int]$response.StatusCode}
        catch [System.Net.WebException]{if(-not $_.Exception.Response){throw};$actual=[int]$_.Exception.Response.StatusCode}
        if($actual -ne $check[1]){throw "Unexpected status $actual for $($check[0])"}
        Write-Output "PASS container $($check[0]) -> $actual"
    }
    $user=(& docker inspect --format '{{.Config.User}}' $containerName).Trim()
    if($user -ne '10001:10001'){throw 'Container is not running as the expected non-root user.'}
    $health=& docker exec $containerName curl --fail --silent http://127.0.0.1:4101/
    if($LASTEXITCODE -ne 0){throw 'Image healthcheck command failed.'}
    Write-Output 'PASS non-root image, read-only root filesystem, isolated writable data, image healthcheck command'
}catch{
    & docker logs $containerName
    throw
}finally{
    & docker rm --force $containerName | Out-Null
}
