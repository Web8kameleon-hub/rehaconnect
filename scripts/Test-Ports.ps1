$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$loader=Join-Path $PSScriptRoot 'Get-Ports.ps1'
$configPath=Join-Path $taskRoot 'ports.json'
$config=& $loader -Path $configPath
Write-Output 'PASS current ports.json'
$temporary=Join-Path ([System.IO.Path]::GetTempPath()) ('reha-ports-'+[guid]::NewGuid()+'.json')
try {
    foreach($case in @('duplicate','range','url','host')) {
        $candidate=Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json
        switch($case){
            'duplicate' {$candidate.services.frontend.port=$candidate.services.longo.port;$candidate.services.frontend.url=$candidate.services.longo.url}
            'range' {$candidate.services.frontend.port=4200;$candidate.services.frontend.url='http://127.0.0.1:4200'}
            'url' {$candidate.services.frontend.url='http://127.0.0.1:4100'}
            'host' {$candidate.services.frontend.host='0.0.0.0'}
        }
        $candidate|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $temporary -Encoding utf8
        $rejected=$false
        try {$null=& $loader -Path $temporary}catch{$rejected=$true}
        if(-not $rejected){throw "Invalid configuration accepted: $case"}
        Write-Output "PASS rejected $case configuration"
    }
}finally{Remove-Item -LiteralPath $temporary -ErrorAction SilentlyContinue}
