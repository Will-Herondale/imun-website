[CmdletBinding()]
param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)][string[]]$Command,
  [int]$TimeoutSec = 150
)

if (-not $Command) { Write-Error 'Usage: .\sudo.ps1 <command-string>'; exit 1 }
$script = $Command -join ' '

$task = Get-ScheduledTask -TaskName 'IMUN-ElevatedRunner' -ErrorAction SilentlyContinue
if (-not $task) {
  & (Join-Path $PSScriptRoot 'install-uac-helper.ps1')
  $task = Get-ScheduledTask -TaskName 'IMUN-ElevatedRunner' -ErrorAction SilentlyContinue
}
if (-not $task) { Write-Error 'Elevated helper task not available.'; exit 2 }

$dir = Join-Path $env:TEMP 'imun-uac'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$id = [guid]::NewGuid().ToString('N')
$enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
$stdout = Join-Path $dir "out-$id.txt"
$stderr = Join-Path $dir "err-$id.txt"
$exitF = Join-Path $dir "exit-$id.txt"
$req = [pscustomobject]@{ id = $id; encodedCommand = $enc; command = $script; stdout = $stdout; stderr = $stderr; exitFile = $exitF }
$reqPath = Join-Path $dir "req-$id.json"
$req | ConvertTo-Json | Set-Content -Path $reqPath -Encoding utf8
@("") | Set-Content -Path $stdout
@("") | Set-Content -Path $stderr
@("") | Set-Content -Path $exitF

schtasks /Run /TN 'IMUN-ElevatedRunner' | Out-Null
$sw = [Diagnostics.Stopwatch]::StartNew()
Start-Sleep -Milliseconds 1500
if (Test-Path $reqPath) {
  schtasks /Run /TN 'IMUN-ElevatedRunner' | Out-Null
}
while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec -and (Test-Path $reqPath)) {
  Start-Sleep -Milliseconds 300
}
if (Test-Path $reqPath) { Write-Error 'Timed out waiting for the elevated runner.'; exit 3 }

$sw.Restart()
while ($sw.Elapsed.TotalSeconds -lt 15) {
  $raw = (Get-Content $exitF -Raw -ErrorAction SilentlyContinue | Out-String).Trim()
  if ($raw -ne '') { break }
  Start-Sleep -Milliseconds 250
}

$code = [int]((Get-Content $exitF -Raw -ErrorAction SilentlyContinue | Out-String).Trim())
$out = Get-Content $stdout -Raw
$err = Get-Content $stderr -Raw
Write-Output $out
if ($err -and $err.Trim()) { Write-Output ("STDERR: " + $err) }
Remove-Item $stdout, $stderr, $exitF -Force -ErrorAction SilentlyContinue
exit $code