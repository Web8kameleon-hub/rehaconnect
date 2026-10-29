param([string]$ReleaseId='')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
if(-not $ReleaseId){$ReleaseId=(& git -C $taskRoot rev-parse HEAD).Trim();if($LASTEXITCODE -ne 0){throw 'Cannot determine release commit.'}}
if($ReleaseId -notmatch '^[a-f0-9]{40}$'){throw 'ReleaseId must be a full reviewed Git commit SHA.'}
$head=(& git -C $taskRoot rev-parse HEAD).Trim()
if($head -ne $ReleaseId){throw 'Package the current reviewed HEAD commit.'}
if(& git -C $taskRoot status --porcelain){throw 'Commit or preserve pending source changes before packaging.'}
$jar=Join-Path $taskRoot 'backend\rehaconnect-api\target\rehaconnect-api-1.0.0.jar'
if(-not (Test-Path -LiteralPath $jar)){throw 'Build the application JAR before packaging.'}
$packageRoot=Join-Path $taskRoot '.cache\deploy'
$stage=Join-Path $packageRoot ($ReleaseId.Substring(0,12)+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path (Join-Path $stage 'backend\rehaconnect-api\target') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage 'docs') -Force | Out-Null
Copy-Item -LiteralPath $jar -Destination (Join-Path $stage 'backend\rehaconnect-api\target')
New-Item -ItemType Directory -Path (Join-Path $stage 'deploy\production') -Force | Out-Null
# An explicit allowlist excludes credentials and local operator files.
foreach($name in @('Dockerfile','compose.yml','.env.example','nginx.conf.example','README.md')){
    Copy-Item -LiteralPath (Join-Path $taskRoot ('deploy\production\'+$name)) -Destination (Join-Path $stage 'deploy\production') -Force
}
Copy-Item -LiteralPath (Join-Path $taskRoot '.dockerignore') -Destination $stage -Force
foreach($name in @('ASSISTANT-WORKFLOW.md','DEPLOYMENT-VALIDATION-2026-10-29.md')){
    Copy-Item -LiteralPath (Join-Path $taskRoot ('docs\'+$name)) -Destination (Join-Path $stage 'docs')
}
Copy-Item -LiteralPath (Join-Path $taskRoot 'LICENSE') -Destination $stage
$jarHash=(Get-FileHash -LiteralPath $jar -Algorithm SHA256).Hash.ToLowerInvariant()
@{releaseId=$ReleaseId;createdUtc=[DateTime]::UtcNow.ToString('o');jarSha256=$jarHash;deployed=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $stage 'release.json') -Encoding utf8
# ZipFile includes dotfiles such as the env template and .dockerignore.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=$stage+'.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($stage,$archive)
$archiveHash=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($archive+'.sha256') -Value ($archiveHash+'  '+[IO.Path]::GetFileName($archive)) -Encoding ascii
Write-Output "Deployment archive: $archive"
Write-Output "SHA256: $archiveHash"
