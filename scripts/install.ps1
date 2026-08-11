# WordLex one-line installer for Windows.
#
#   PowerShell:
#     irm https://raw.githubusercontent.com/vedesh-padal/wordlex/main/scripts/install.ps1 | iex
#
# Downloads the native installer (.exe/.msi) for the latest release and runs it.
# To pin a specific version (defaults to latest):
#     $env:WORDLEX_VERSION = '2.0.0'
#     irm https://raw.githubusercontent.com/vedesh-padal/wordlex/main/scripts/install.ps1 | iex

$ErrorActionPreference = 'Stop'

$repo = 'vedesh-padal/wordlex'
$version = if ($env:WORDLEX_VERSION) { $env:WORDLEX_VERSION } else { 'latest' }

$api = if ($version -eq 'latest') {
    "https://api.github.com/repos/$repo/releases/latest"
} else {
    "https://api.github.com/repos/$repo/releases/tags/v$version"
}

Write-Host "[wordlex] Resolving the WordLex $version release..."
$release = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'WordLex-installer' }

$asset = $release.assets | Where-Object { $_.name -match 'x64-setup\.exe$' } | Select-Object -First 1
if (-not $asset) {
    $asset = $release.assets | Where-Object { $_.name -match '_x64_en-US\.msi$' } | Select-Object -First 1
}
if (-not $asset) {
    throw "No Windows installer found in release $($release.tag_name)."
}

$tmp = Join-Path $env:TEMP $asset.name
Write-Host "[wordlex] Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp

if ($asset.name -match '\.msi$') {
    Write-Host "[wordlex] Installing..."
    Start-Process msiexec -ArgumentList @('/i', "`"$tmp`"", '/passive', '/norestart') -Wait
} else {
    Write-Host "[wordlex] Installing..."
    Start-Process $tmp -ArgumentList @('/S') -Wait
}

Write-Host "[wordlex] WordLex installed. Find it in the Start Menu."
