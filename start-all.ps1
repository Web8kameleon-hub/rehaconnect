# start-all.ps1
$base = "C:\Users\pc\Rehaconnect"

# Lexo .env
$envFile = Get-Content "$base\.env" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" }
$envVars = @{}
foreach ($line in $envFile) {
    $key, $value = $line -split "=", 2
    $envVars[$key.Trim()] = $value.Trim()
}

Write-Host "🚀 Duke nisur të gjitha shërbimet me portat:" -ForegroundColor Cyan
Write-Host "   Longo: $($envVars['LONGO_PORT'])" -ForegroundColor Yellow
Write-Host "   RehaConnect: $($envVars['REHACONNECT_PORT'])" -ForegroundColor Yellow
Write-Host "   Lightning SPP: $($envVars['LIGHTNING_SPP_PORT'])" -ForegroundColor Yellow

# 1. Nis Longo
$longoCmd = "`$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'; `$env:PATH = `"`$env:JAVA_HOME\bin;`$env:PATH`"; `$env:LONGO_PORT = '$($envVars['LONGO_PORT'])'; `$env:LONGO_HOST = '$($envVars['LONGO_HOST'])'; `$env:LONGO_STORAGE_PATH = '$($envVars['LONGO_STORAGE_PATH'])'; cd '$base\infrastructure\longo\java-longo'; mvn exec:java `"-Dexec.mainClass=com.clisonix.longo.LongoServer`""
Start-Process powershell -ArgumentList "-NoExit", "-Command", $longoCmd

# 2. Nis RehaConnect API
$apiCmd = "`$env:REHACONNECT_PORT = '$($envVars['REHACONNECT_PORT'])'; `$env:LONGO_PORT = '$($envVars['LONGO_PORT'])'; `$env:LIGHTNING_SPP_PORT = '$($envVars['LIGHTNING_SPP_PORT'])'; cd '$base\backend\rehaconnect-api'; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCmd

# 3. Nis Lightning SPP
$lightningCmd = "`$env:LIGHTNING_SPP_PORT = '$($envVars['LIGHTNING_SPP_PORT'])'; cd '$base\services\lightning-spp-3.14\source'; dotnet run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $lightningCmd

Write-Host "✅ Të gjitha shërbimet u nisën!" -ForegroundColor Green
