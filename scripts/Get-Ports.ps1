param([string]$Path=(Join-Path (Split-Path -Parent $PSScriptRoot) 'ports.json'))
$ErrorActionPreference='Stop'
$config=Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
if($config.version -ne '1.0' -or $config.host -ne '127.0.0.1'){throw 'ports.json requires version 1.0 and loopback host 127.0.0.1.'}
if($config.portRange.start -ne 4100 -or $config.portRange.end -ne 4199){throw 'The reserved RehaConnect range is 4100-4199.'}
$seen=@()
foreach($name in @('longo','rehaconnect-api','lightning-spp','frontend')){
    $service=$config.services.$name
    if($null -eq $service){throw "Missing service in ports.json: $name"}
    $port=[int]$service.port
    if($port -lt 4100 -or $port -gt 4199 -or "$port" -ne "$($service.port)"){throw "Invalid port for $name; use an integer in 4100-4199."}
    if($seen -contains $port){throw 'Each RehaConnect service requires a different port.'}
    $seen+=$port
    if($service.host -ne '127.0.0.1' -or $service.url -ne "http://127.0.0.1:$port"){throw "Host or URL does not match the port for $name."}
}
$config
