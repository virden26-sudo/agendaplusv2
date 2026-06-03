# One-time setup: Android SDK + JDK user environment variables (Windows).
# Run from PowerShell:  .\scripts\setup-android-env.ps1
# Then open a NEW terminal (or restart Cursor) for changes to apply.

$ErrorActionPreference = 'Stop'

$androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$javaHome = 'C:\Program Files\Android\Android Studio\jbr'

if (-not (Test-Path $androidSdk)) {
    Write-Error "Android SDK not found at: $androidSdk. Install Android Studio and the SDK first."
}
if (-not (Test-Path "$javaHome\bin\java.exe")) {
    Write-Error "JDK not found at: $javaHome. Install Android Studio or set `$javaHome in this script."
}

[Environment]::SetEnvironmentVariable('ANDROID_HOME', $androidSdk, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $androidSdk, 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')

$pathAdditions = @(
    "$javaHome\bin",
    "$androidSdk\platform-tools",
    "$androidSdk\emulator"
)
$cmdlineTools = Join-Path $androidSdk 'cmdline-tools\latest\bin'
if (Test-Path $cmdlineTools) {
    $pathAdditions += $cmdlineTools
}

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }

foreach ($segment in $pathAdditions) {
    if ($userPath -notlike "*$segment*") {
        $userPath = if ($userPath) { "$segment;$userPath" } else { $segment }
    }
}
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

# Keep android/local.properties in sync (gitignored)
$localProps = Join-Path $PSScriptRoot '..\android\local.properties' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $localProps) {
    $localProps = Join-Path (Split-Path $PSScriptRoot -Parent) 'android\local.properties'
}
$sdkDirLine = "sdk.dir=$($androidSdk -replace '\\', '/')"
Set-Content -Path $localProps -Value @(
    '## Machine-specific. Do not commit.',
    $sdkDirLine
) -Encoding UTF8

Write-Host 'Set (User):'
Write-Host "  ANDROID_HOME = $androidSdk"
Write-Host "  ANDROID_SDK_ROOT = $androidSdk"
Write-Host "  JAVA_HOME = $javaHome"
Write-Host "  Updated User PATH with Java + Android tools"
Write-Host "  Wrote $localProps"
Write-Host ''
Write-Host 'Open a NEW terminal, then build with: npm run android:apk'
