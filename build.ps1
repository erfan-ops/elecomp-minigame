<#
Builds the whole kiosk in one shot:

  1. frontend  — npm run build (tsc -b && vite build) into frontend/dist
  2. sync      — mirror frontend/dist into backend/frontend (full wipe, so no
                 stale hashed bundle can survive)
  3. backend   — PyInstaller onedir .exe with that mirror bundled in

Result: backend\dist\smartis-game\smartis-game.exe

Run from anywhere:
    powershell -ExecutionPolicy Bypass -File .\build.ps1

Exports from a previous build (backend\dist\smartis-game\output\) are moved
aside and restored afterwards — PyInstaller's -y wipes that whole folder.
#>

$ErrorActionPreference = "Stop"

$Root        = $PSScriptRoot
$FrontendDir = Join-Path $Root "frontend"
$DistDir     = Join-Path $FrontendDir "dist"
$BackendDir  = Join-Path $Root "backend"
$MirrorDir   = Join-Path $BackendDir "frontend"
$VenvDir     = Join-Path $BackendDir ".venv"
$ExeDistDir  = Join-Path $BackendDir "dist\smartis-game"
$OutputDir   = Join-Path $ExeDistDir "output"

function Write-Step($text) {
    Write-Host ""
    Write-Host "==> $text" -ForegroundColor Cyan
}

# $ErrorActionPreference does not apply to native executables — check by hand.
function Assert-LastExitCode($what) {
    if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" }
}

$started = Get-Date

# --- 1. Frontend ------------------------------------------------------------
Write-Step "Building the frontend (npm run build)"
Push-Location $FrontendDir
try {
    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Host "    node_modules missing — running npm install first"
        npm install
        Assert-LastExitCode "npm install"
    }
    npm run build
    Assert-LastExitCode "npm run build"
} finally {
    Pop-Location
}

# --- 2. Sync dist/ into backend/frontend ------------------------------------
Write-Step "Syncing frontend\dist -> backend\frontend"
if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
    throw "no index.html in $DistDir — the frontend build produced nothing"
}
# Wipe rather than overwrite: hashed asset filenames change every build, so a
# merge would leave the old bundles behind.
if (Test-Path $MirrorDir) { Remove-Item -Recurse -Force $MirrorDir }
New-Item -ItemType Directory -Path $MirrorDir | Out-Null
Copy-Item -Path (Join-Path $DistDir "*") -Destination $MirrorDir -Recurse -Force
$fileCount = (Get-ChildItem -Recurse -File $MirrorDir | Measure-Object).Count
Write-Host "    $fileCount file(s) mirrored"

# --- 3. Backend .exe --------------------------------------------------------
Write-Step "Packaging the backend (PyInstaller)"
Push-Location $BackendDir
try {
    if (-not (Test-Path $VenvDir)) {
        Write-Host "    .venv missing — running uv sync first"
        uv sync
        Assert-LastExitCode "uv sync"
    }

    $pyinstaller = Join-Path $VenvDir "Scripts\pyinstaller.exe"
    if (-not (Test-Path $pyinstaller)) {
        Write-Host "    pyinstaller missing from .venv — installing it"
        uv pip install pyinstaller
        Assert-LastExitCode "uv pip install pyinstaller"
    }

    # -y deletes dist\smartis-game entirely, exported game data included.
    $preserved = $null
    if (Test-Path $OutputDir) {
        $preserved = Join-Path $BackendDir (".output-preserved-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
        Move-Item $OutputDir $preserved
        Write-Host "    previous exports moved aside -> $preserved"
    }

    try {
        # Onedir (-D), not onefile: output\ has to outlive the process.
        # --add-data bundles the mirror as _internal\frontend.
        & $pyinstaller -y -D -w -n smartis-game --add-data "frontend;frontend" .\main.py
        Assert-LastExitCode "pyinstaller"
    } finally {
        if ($preserved -and (Test-Path $preserved)) {
            if (Test-Path $ExeDistDir) {
                Move-Item $preserved $OutputDir
                Write-Host "    previous exports restored -> $OutputDir"
            } else {
                Write-Warning "build produced no $ExeDistDir — exports left in $preserved"
            }
        }
    }
} finally {
    Pop-Location
}

$exe = Join-Path $ExeDistDir "smartis-game.exe"
if (-not (Test-Path $exe)) { throw "expected $exe, but it is not there" }

Write-Host ""
Write-Host ("Done in {0:n0}s" -f ((Get-Date) - $started).TotalSeconds) -ForegroundColor Green
Write-Host "  $exe"
Write-Host "  exports -> $OutputDir"
Write-Host "  log     -> $(Join-Path $ExeDistDir 'pywebview.log')"
