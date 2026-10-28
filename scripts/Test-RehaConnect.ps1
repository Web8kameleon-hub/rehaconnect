param([ValidateRange(4100,4199)][int]$Port=4199)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$jar=Join-Path $taskRoot 'backend\rehaconnect-api\target\rehaconnect-api-1.0.0.jar'
$logRoot=Join-Path $taskRoot '.cache\checks'
New-Item -ItemType Directory -Force $logRoot | Out-Null
$runtime=Start-Process java -ArgumentList @('-jar',$jar,"--server.port=$Port",'--debug=false','--logging.level.root=WARN','--lightning.internal-url=') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'stdout.log') -RedirectStandardError (Join-Path $logRoot 'stderr.log')
function Assert-Http($Path,$Expected,$Method='GET',$Body=$null,$Headers=@{}) {
    try {
        $arguments=@{Uri="http://127.0.0.1:$Port$Path";Method=$Method;UseBasicParsing=$true;Headers=$Headers;TimeoutSec=5}
        if($null -ne $Body){$arguments.Body=$Body;$arguments.ContentType='application/json'}
        $result=Invoke-WebRequest @arguments
        $actual=[int]$result.StatusCode
    } catch [System.Net.WebException] {
        if($null -eq $_.Exception.Response){throw}
        $actual=[int]$_.Exception.Response.StatusCode
    }
    if($actual -ne $Expected){throw "$Method $Path expected $Expected, got $actual"}
    Write-Output "PASS $Method $Path -> $actual"
}
try {
    $ready=$false
    for($attempt=0;$attempt -lt 100;$attempt++){
        if($runtime.HasExited){throw 'Server exited before readiness'}
        try{$null=Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 1;$ready=$true;break}catch{Start-Sleep -Milliseconds 150}
    }
    if(-not $ready){throw 'Server readiness timed out'}
    Assert-Http '/' 200
    Assert-Http '/integrations.js' 200
    Assert-Http '/account' 200
    Assert-Http '/dashboard' 200
    Assert-Http '/api/clinics' 401
    Assert-Http '/api/clinics' 401 'POST' '{}'
    Assert-Http '/api/auth/me' 401
    Assert-Http '/api/account/login' 403 'POST' '{}'
    Assert-Http '/api/account/not-an-action' 404
    Assert-Http '/api/billing/webhook' 400 'POST' '{}'
    Assert-Http '/api/account/csrf' 503
} finally {if(-not $runtime.HasExited){Stop-Process -Id $runtime.Id}}
