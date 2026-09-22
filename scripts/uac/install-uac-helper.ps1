$ErrorActionPreference = 'Stop'
$repo = 'C:\DefaultStuff\IMUN_WEB'
$runner = Join-Path $repo 'scripts\uac\elevated-runner.ps1'
$taskName = 'IMUN-ElevatedRunner'

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = [Security.Principal.WindowsPrincipal]$id
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
  Write-Host 'Requesting elevation once (accept the UAC prompt) ...'
  $me = $MyInvocation.MyCommand.Path
  $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$me`" -Elevated"
  Start-Process -FilePath 'pwsh.exe' -ArgumentList $arg -Verb RunAs -Wait
  exit 0
}

$action = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -File `"$runner`""
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Registered scheduled task '$taskName'. UAC elevation is now silent."