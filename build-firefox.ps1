# build-firefox.ps1
# Builds a clean Firefox extension bundle into dist/firefox/ from this folder.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\build-firefox.ps1
#   powershell -ExecutionPolicy Bypass -File .\build-firefox.ps1 -Zip
#   powershell -ExecutionPolicy Bypass -File .\build-firefox.ps1 -Bundle -Zip
#
#   -Bundle   Regenerate the esbuild bundles first (toxicity model + cookie
#             engine) so the copied artifacts are guaranteed fresh. Requires
#             `npm install` to have been run.
#   -Zip      Also produce dist/sieve-firefox.zip (forward-slash entry paths,
#             which Firefox / AMO require).
#   -OpenSource
#             Build without Sieve Pro, on purpose: pro\ keeps its empty
#             stand-ins. What CI builds, and what anyone can build from GitHub.
#   -Sandbox  With -Zip: a test package whose Pro may use Polar's sandbox.
#             Never upload one.
#
# Sieve Pro comes from a private repository checked out at pro-private\ (see
# pro\README.md and build-pro.mjs). A plain build includes it when that
# checkout is there; a store package (-Zip) refuses to build without it, or
# while common\pro.js cannot sell through Polar's live store yet.

[CmdletBinding()]
param(
    [switch]$Bundle,
    [switch]$Zip,
    [switch]$OpenSource,
    [switch]$Sandbox
)

$ErrorActionPreference = "Stop"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcDir      = $ScriptDir
$OutDir      = Join-Path $ScriptDir "dist\firefox"
$ManifestSrc = Join-Path $SrcDir "manifest.firefox.json"
$ManifestDst = Join-Path $OutDir "manifest.json"

$ProKind = if ($OpenSource) { "open-source" } elseif ($Zip -and $Sandbox) { "sandbox" } elseif ($Zip) { "store" } else { "dev" }

# Whole folders copied verbatim into the build. Anything not listed here
# (node_modules, src, vendor, cookie-rules-extra, test, _metadata, docs) is
# dev-only and never shipped.
$RuntimeFolders = @(
    "background",
    "common",
    "content",
    "data",
    "icons",
    "options",
    "pages",
    "popup",
    "pro",
    "rules"
)
$RuntimeFiles   = @(
    "LICENSE"
)

# Built artifacts + critical data files that MUST be present in the output,
# or the extension is broken. Verified after copy.
$RequiredAssets = @(
    "background\service-worker.js",
    "background\ad-tracker-stats.js",
    "background\retired-tracker-blocker.js",
    "pro\features.js",
    "content\cookie-engine.bundle.js",
    "content\youtube-ads.js",
    "content\youtube-ads-bridge.js",
    "content\youtube-ads.css",
    "content\facebook-ads.js",
    "content\facebook-ads-dom.js",
    "content\facebook-ads-bridge.js",
    "content\facebook-ads.css",
    "content\anti-adblock.js",
    "content\anti-adblock-dom.js",
    "content\ad-slot-collapse.js",
    "content\float-video.js",
    "content\float-video.css",
    "data\cookie-rules.json",
    "data\tracker-domains.json",
    "rules\gambling-rules.json",
    "rules\prediction-market-rules.json",
    "rules\youtube-suggest-rules.json",
    "rules\youtube-restrict-moderate-rules.json",
    "rules\youtube-restrict-strict-rules.json",
    "rules\google-web-only-rules.json",
    "content\google-clean.js",
    "content\google-clean.css",
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

# Checked before anything is cleaned, so a refused package leaves dist\ as it was.
Write-Host "==> Checking Sieve Pro ($ProKind build)" -ForegroundColor Cyan
& node (Join-Path $SrcDir "build-pro.mjs") --check $ProKind
if ($LASTEXITCODE -ne 0) { throw "This build cannot be made (see above)." }

Write-Host "==> Cleaning $OutDir" -ForegroundColor Cyan
if (Test-Path $OutDir) {
    Remove-Item -Path $OutDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

Write-Host "==> Copying manifest (manifest.firefox.json -> manifest.json)" -ForegroundColor Cyan
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

Write-Host "==> Sieve Pro" -ForegroundColor Cyan
& node (Join-Path $SrcDir "build-pro.mjs") $OutDir $ProKind
if ($LASTEXITCODE -ne 0) { throw "build-pro.mjs failed" }

Write-Host "==> Removing Chrome-only payload" -ForegroundColor Cyan
# content\toxic-model.bundle.js is 638 KB of TensorFlow.js, and its ONLY consumer
# is offscreen\toxic-offscreen.html. Firefox has no chrome.offscreen, so that
# document can never be created and the bundle can never be loaded - it was 14%
# of the Firefox package doing nothing at all. The offscreen folder is excluded
# from $RuntimeFolders above for the same reason; this removes the bundle, which
# lives under content\ alongside the scripts that ARE injected.
$DeadPayload = Join-Path $OutDir "content\toxic-model.bundle.js"
if (Test-Path $DeadPayload) {
    Remove-Item -Path $DeadPayload -Force
}

Write-Host "==> Stripping comments from the packaged JavaScript" -ForegroundColor Cyan
# The source is heavily commented on purpose; the package does not need any of
# it. This removes comments ONLY - every statement keeps its own line and its
# indentation, so the shipped code is still readable and is not "minified" in
# the sense Mozilla's add-on policies mean. Each file is verified against its
# original (esbuild minifies both; they must match byte for byte) and is copied
# through untouched if it does not, so this can never ship a broken file.
& node (Join-Path $SrcDir "build-strip-comments.mjs") $OutDir
if ($LASTEXITCODE -ne 0) { throw "build-strip-comments.mjs failed" }

Write-Host "==> Verifying required assets" -ForegroundColor Cyan
foreach ($asset in $RequiredAssets) {
    $assetPath = Join-Path $OutDir $asset
    if (-not (Test-Path $assetPath)) {
        throw "Missing required asset in Firefox build: $asset (did you run `npm run build` and `node build-cookie-engine.mjs`, or pass -Bundle?)"
    }
}

if ($Zip) {
    $ZipPath = Join-Path $ScriptDir "dist\sieve-firefox.zip"
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    Write-Host "==> Creating $ZipPath" -ForegroundColor Cyan

    # Use .NET ZipFile so entry paths use forward slashes (Firefox rejects backslashes)
    [System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
    # ZipFile.Open with mode "Create" returns a ZipArchive instance
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

Write-Host "==> Firefox build complete: $OutDir" -ForegroundColor Green
# The stand-in's statement survives comment stripping; the real file's does not exist.
if (Select-String -Path (Join-Path $OutDir "pro\features.js") -SimpleMatch "SieveProFeatures = null" -Quiet) {
    Write-Host "==> Sieve Pro: not included" -ForegroundColor Yellow
} else {
    Write-Host "==> Sieve Pro: included" -ForegroundColor Green
}
if ($ProKind -eq "sandbox") { Write-Host "==> TEST PACKAGE: Sieve Pro may use Polar's sandbox. Never upload it to a store." -ForegroundColor Yellow }
if ($Zip) { Write-Host "==> Zip: $ZipPath" -ForegroundColor Green }
