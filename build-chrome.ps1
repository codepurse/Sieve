# build-chrome.ps1
# Builds a clean Chrome extension bundle into dist/chrome/ from this folder.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\build-chrome.ps1
#   powershell -ExecutionPolicy Bypass -File .\build-chrome.ps1 -Zip
#   powershell -ExecutionPolicy Bypass -File .\build-chrome.ps1 -Bundle -Zip
#
#   -Bundle   Regenerate the esbuild bundles first (toxicity model + cookie
#             engine) so the copied artifacts are guaranteed fresh. Requires
#             `npm install` to have been run.
#   -Zip      Also produce dist/sieve-chrome.zip.

[CmdletBinding()]
param(
    [switch]$Bundle,
    [switch]$Zip
)

$ErrorActionPreference = "Stop"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcDir      = $ScriptDir
$OutDir      = Join-Path $ScriptDir "dist\chrome"
$ManifestSrc = Join-Path $SrcDir "manifest.json"
$ManifestDst = Join-Path $OutDir "manifest.json"

# Whole folders copied verbatim into the build. Anything not listed here
# (node_modules, src, vendor, cookie-rules-extra, test, _metadata, docs) is
# dev-only and never shipped.
$RuntimeFolders = @(
    "background",
    "common",
    "content",
    "data",
    "icons",
    "offscreen",
    "options",
    "pages",
    "popup",
    "rules"
)
$RuntimeFiles   = @(
    "LICENSE"
)

# Built artifacts + critical data files that MUST be present in the output,
# or the extension is broken. Verified after copy.
$RequiredAssets = @(
    "background\service-worker.js",
    "content\cookie-engine.bundle.js",
    "content\toxic-model.bundle.js",
    "data\cookie-rules.json",
    "rules\gambling-rules.json",
    "rules\prediction-market-rules.json",
    "popup\popup.html",
    "options\options.html"
)

if ($Bundle) {
    Write-Host "==> Regenerating esbuild bundles" -ForegroundColor Cyan
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    & node build-cookie-engine.mjs
    if ($LASTEXITCODE -ne 0) { throw "build-cookie-engine.mjs failed" }
}

Write-Host "==> Cleaning $OutDir" -ForegroundColor Cyan
if (Test-Path $OutDir) {
    Remove-Item -Path $OutDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

Write-Host "==> Copying manifest" -ForegroundColor Cyan
Copy-Item -Path $ManifestSrc -Destination $ManifestDst -Force

Write-Host "==> Copying runtime folders" -ForegroundColor Cyan
foreach ($folder in $RuntimeFolders) {
    $src = Join-Path $SrcDir $folder
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $OutDir -Recurse -Force
    }
}

Write-Host "==> Copying runtime files" -ForegroundColor Cyan
foreach ($file in $RuntimeFiles) {
    $src = Join-Path $SrcDir $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $OutDir $file) -Force
    }
}

Write-Host "==> Verifying required assets" -ForegroundColor Cyan
foreach ($asset in $RequiredAssets) {
    $assetPath = Join-Path $OutDir $asset
    if (-not (Test-Path $assetPath)) {
        throw "Missing required asset in Chrome build: $asset (did you run `npm run build` and `node build-cookie-engine.mjs`, or pass -Bundle?)"
    }
}

if ($Zip) {
    $ZipPath = Join-Path $ScriptDir "dist\sieve-chrome.zip"
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    Write-Host "==> Creating $ZipPath" -ForegroundColor Cyan

    # Use .NET ZipFile so entry paths use forward slashes. Compress-Archive on
    # Windows PowerShell 5.1 writes backslash separators (rules\gambling-rules.json),
    # which Chrome tolerates but the Edge Partner Center validator rejects
    # ("ZIP file doesn't contain the rules/gambling-rules.json file"). The same
    # package is valid for both Chrome and Edge once entries use forward slashes.
    [System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
    $ZipStream = [System.IO.Compression.ZipFile]::Open($ZipPath, "Create")
    try {
        $files = Get-ChildItem -Path $OutDir -Recurse -File
        foreach ($f in $files) {
            $rel = $f.FullName.Substring($OutDir.Length).TrimStart('\', '/') -replace '\\', '/'
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($ZipStream, $f.FullName, $rel, "Optimal") | Out-Null
        }
    } finally {
        $ZipStream.Dispose()
    }
}

Write-Host "==> Chrome build complete: $OutDir" -ForegroundColor Green
if ($Zip) { Write-Host "==> Zip: $ZipPath" -ForegroundColor Green }
