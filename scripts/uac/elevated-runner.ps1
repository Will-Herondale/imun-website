$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:TEMP 'imun-uac'
if (!(Test-Path $dir)) { return }
$req = Get-ChildItem -Path $dir -Filter 'req-*.json' | Sort-Object LastWriteTime | Select-Object -Last 1
if (!$req) { return }
$r = Get-Content $req.FullName -Raw | ConvertFrom-Json
$enc = $r.encodedCommand
$outFile = $r.stdout
$errFile = $r.stderr
$exitFile = $r.exitFile
@("") | Set-Content -Path $outFile
@("") | Set-Content -Path $errFile
$code = -1
try {
  $pwsh = (Get-Command pwsh).Source
  $p = Start-Process -FilePath $pwsh -ArgumentList '-NoProfile', '-NonInteractive', '-EncodedCommand', $enc -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  $code = [int]$p.ExitCode
} catch {
  $code = -999
  Add-Content -Path $errFile -Value $_.Exception.Message
}
Set-Content -Path $exitFile -Value $code
Remove-Item $req.FullName -Force -ErrorAction SilentlyContinue