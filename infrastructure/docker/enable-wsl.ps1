#requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

$features = @(
  'VirtualMachinePlatform',
  'Microsoft-Windows-Subsystem-Linux'
)

foreach ($feature in $features) {
  Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart | Out-Host
}

bcdedit /set hypervisorlaunchtype auto | Out-Host

Write-Host ''
Write-Host 'WSL and Virtual Machine Platform are enabled.' -ForegroundColor Green
Write-Host 'Restart Windows before starting Docker Desktop.' -ForegroundColor Yellow
