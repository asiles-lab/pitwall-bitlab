$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
$nodeCandidates = @(
  (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
  "C:\Users\Noxi-PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

if (-not $nodeCandidates) {
  throw "No se encontro Node.js para ejecutar el actualizador."
}

$node = $nodeCandidates[0]
$stateDir = Join-Path $env:LOCALAPPDATA "PitwallBitlab"
$logPath = Join-Path $stateDir "news-updater.log"
$lockPath = Join-Path $stateDir "news-updater.lock"
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & $FilePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($output) {
    $output | ForEach-Object { Write-Log $_.ToString() }
  }
  if ($exitCode -ne 0) {
    throw "Fallo '$FilePath $($Arguments -join ' ')' con codigo $exitCode."
  }
  return $output
}

$lock = $null
try {
  try {
    $lock = [System.IO.File]::Open($lockPath, "OpenOrCreate", "ReadWrite", "None")
  } catch [System.IO.IOException] {
    Write-Log "Otra actualizacion sigue en curso; esta ejecucion se omite."
    exit 0
  }

  Set-Location -LiteralPath $repo
  Write-Log "Inicio de revision automatica."

  $before = (& git status --porcelain 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo leer el estado de Git."
  }
  if ($before) {
    Write-Log "Revision omitida: el repositorio contiene cambios locales."
    exit 2
  }

  Invoke-Checked "git" @("pull", "--rebase", "origin", "main") | Out-Null
  Invoke-Checked $node @("scripts/update-news.mjs") | Out-Null

  & git diff --quiet -- data/news.json
  if ($LASTEXITCODE -eq 0) {
    Write-Log "Sin cambios para publicar."
    exit 0
  }
  if ($LASTEXITCODE -ne 1) {
    throw "No se pudo comprobar data/news.json."
  }

  $changed = @(& git status --porcelain | ForEach-Object { $_.Substring(3) })
  if ($changed.Count -ne 1 -or $changed[0] -ne "data/news.json") {
    throw "Se detectaron cambios inesperados luego de actualizar: $($changed -join ', ')"
  }

  Invoke-Checked $node @("--check", "scripts/update-news.mjs") | Out-Null
  Invoke-Checked $node @("--check", "app.js") | Out-Null
  Invoke-Checked $node @("-e", "JSON.parse(require('fs').readFileSync('data/news.json','utf8'))") | Out-Null
  Invoke-Checked "git" @("add", "data/news.json") | Out-Null
  Invoke-Checked "git" @("commit", "-m", "Update F1 news") | Out-Null
  Invoke-Checked "git" @("pull", "--rebase", "origin", "main") | Out-Null
  Invoke-Checked "git" @("push", "origin", "main") | Out-Null

  Write-Log "Noticias validadas y publicadas correctamente."
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
} finally {
  if ($lock) {
    $lock.Dispose()
  }
}
