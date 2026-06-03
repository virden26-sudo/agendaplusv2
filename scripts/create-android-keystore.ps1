# Creates android/agendaplus-release.keystore and android/keystore.properties (gitignored).
# Run once:  .\scripts\create-android-keystore.ps1
# BACK UP the keystore and passwords — you cannot publish updates without them.

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$androidDir = Join-Path $repoRoot 'android'
$keystorePath = Join-Path $androidDir 'agendaplus-release.keystore'
$propsPath = Join-Path $androidDir 'keystore.properties'
$credsPath = Join-Path $androidDir 'keystore.credentials.txt'

$javaHome = $env:JAVA_HOME
if (-not $javaHome -or -not (Test-Path "$javaHome\bin\keytool.exe")) {
    $javaHome = 'C:\Program Files\Android\Android Studio\jbr'
}
$keytool = Join-Path $javaHome 'bin\keytool.exe'
if (-not (Test-Path $keytool)) {
    Write-Error "keytool not found. Set JAVA_HOME or install Android Studio."
}

if (Test-Path $keystorePath) {
    Write-Error "Keystore already exists: $keystorePath`nDelete it first only if you intend to replace it (you will break Play Store updates for the old key)."
}

$alias = 'agendaplus'
$validityDays = 10000
# 24-char random password (letters + digits, no symbols that break .properties)
$chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 24
$rng.GetBytes($bytes)
$password = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

$dname = 'CN=Agenda Plus, OU=Mobile, O=AgendaPlus, L=Unknown, ST=Unknown, C=US'

& $keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore $keystorePath `
    -alias $alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity $validityDays `
    -storepass $password `
    -keypass $password `
    -dname $dname

@(
    'storeFile=../agendaplus-release.keystore',
    "storePassword=$password",
    "keyAlias=$alias",
    "keyPassword=$password"
) | Set-Content -Path $propsPath -Encoding ASCII

@(
    'Agenda+ Android release signing — KEEP SECRET, DO NOT COMMIT',
    "Created: $(Get-Date -Format o)",
    "Keystore: $keystorePath",
    "Alias: $alias",
    "Store password: $password",
    "Key password: $password",
    '',
    'Also stored in keystore.properties (used by Gradle).',
    'Back up this file and the .keystore to a password manager / secure drive.',
    'Losing them means you cannot update the app on Play Store with the same listing.'
) | Set-Content -Path $credsPath -Encoding UTF8

Write-Host ''
Write-Host 'Created release keystore:'
Write-Host "  $keystorePath"
Write-Host "  $propsPath"
Write-Host "  $credsPath  (save a backup; gitignored)"
Write-Host ''
Write-Host 'Rebuild signed release APK:'
Write-Host '  npm run android:apk'
