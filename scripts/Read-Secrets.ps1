param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference='Stop'
$allowed=@('RESEND_API_KEY','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM','SMTP_USE_SSL','STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_WEBHOOK_SECRET_SNAPSHOT','STRIPE_WEBHOOK_SECRET_THIN','LSPP_STRIPE_PLANS','LSPP_LICENSE_SIGNING_KEY','LSPP_LICENSE_SIGNING_KEYS')
$result=@{}
foreach($line in (Get-Content -LiteralPath $Path)){
    $line=$line.Trim()
    if(-not $line -or $line.StartsWith('#')){continue}
    if($line -notmatch '^([A-Z][A-Z0-9_]*)=(.*)$'){throw 'Invalid entry in the local secrets file; expected KEY=value.'}
    $key=$matches[1];$value=$matches[2].Trim()
    if($key -notin $allowed){throw "Unsupported secret setting: $key"}
    if($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))){$value=$value.Substring(1,$value.Length-2)}
    if($value){$result[$key]=$value}
}
Write-Output -NoEnumerate $result
