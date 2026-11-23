# Run from PowerShell:  .\start-backend.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot 'backend')
$envFile = Join-Path (Get-Location) '.env'
if (-not (Test-Path $envFile)) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created backend/.env. Edit DB_PASSWORD, ADMIN_EMAIL and ADMIN_PASSWORD (16+ chars), then rerun this script.' -ForegroundColor Yellow
    exit 1
}
function Read-EnvFile {
    foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
        $entry = $line.Trim()
        if (-not $entry -or $entry.StartsWith('#')) { continue }
        $parts = $entry.Split('=', 2)
        if ($parts.Count -ne 2 -or $parts[0] -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "Invalid .env line: $entry" }
        $value = $parts[1].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value = $value.Substring(1, $value.Length - 2) }
        [Environment]::SetEnvironmentVariable($parts[0], $value, 'Process')
    }
}
Read-EnvFile
# Generate the MFA encryption key once and save it in .env (admin login needs it).
if ([string]::IsNullOrWhiteSpace($env:ADMIN_MFA_ENCRYPTION_KEY) -or $env:ADMIN_MFA_ENCRYPTION_KEY -eq 'REPLACE_WITH_GENERATED_KEY') {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes)
    $key = [Convert]::ToBase64String($bytes)
    $text = [System.IO.File]::ReadAllText($envFile)
    if ($text -match '(?m)^ADMIN_MFA_ENCRYPTION_KEY=.*$') { $text = [regex]::Replace($text, '(?m)^ADMIN_MFA_ENCRYPTION_KEY=.*$', "ADMIN_MFA_ENCRYPTION_KEY=$key") }
    else { $text = $text.TrimEnd() + "`r`nADMIN_MFA_ENCRYPTION_KEY=$key`r`n" }
    [System.IO.File]::WriteAllText($envFile, $text)
    [Environment]::SetEnvironmentVariable('ADMIN_MFA_ENCRYPTION_KEY', $key, 'Process')
    Write-Host 'Generated ADMIN_MFA_ENCRYPTION_KEY in backend/.env. BACK IT UP: losing it locks existing admin MFA.' -ForegroundColor Yellow
}
if ($env:DB_PASSWORD -eq 'REPLACE_WITH_MYSQL_PASSWORD' -or [string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) { throw 'Set DB_PASSWORD in backend/.env first.' }
if ($env:ADMIN_PASSWORD -eq 'REPLACE_WITH_UNIQUE_STRONG_ADMIN_PASSWORD' -or [string]::IsNullOrWhiteSpace($env:ADMIN_PASSWORD)) { throw 'Set ADMIN_PASSWORD in backend/.env first.' }
Write-Host 'Starting Hajara backend on port' ($(if ($env:SERVER_PORT) { $env:SERVER_PORT } else { '8081' }))
& mvn spring-boot:run
exit $LASTEXITCODE
