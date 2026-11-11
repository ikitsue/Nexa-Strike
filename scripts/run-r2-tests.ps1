$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'test-r2-local.mjs'

function Set-EnvironmentSecret {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Prompt
  )

  $secureValue = Read-Host -Prompt $Prompt -AsSecureString
  $pointer = [IntPtr]::Zero
  try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ([string]::IsNullOrWhiteSpace($plainValue)) {
      throw "Une valeur vide n'est pas autorisee."
    }
    [Environment]::SetEnvironmentVariable($Name, $plainValue, 'Process')
    $plainValue = $null
  }
  finally {
    if ($pointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    if ($null -ne $secureValue) {
      $secureValue.Dispose()
    }
  }
}

$temporaryNames = @(
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_STAGING_ACCESS_KEY_ID',
  'R2_STAGING_SECRET_ACCESS_KEY'
)
$previousValues = @{}

try {
  foreach ($name in $temporaryNames) {
    $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
  }

  if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw 'Le script de test local est introuvable.'
  }

  Set-EnvironmentSecret -Name 'R2_ACCESS_KEY_ID' -Prompt 'Access Key ID du credential public'
  Set-EnvironmentSecret -Name 'R2_SECRET_ACCESS_KEY' -Prompt 'Secret Access Key du credential public'
  Set-EnvironmentSecret -Name 'R2_STAGING_ACCESS_KEY_ID' -Prompt 'Access Key ID du credential staging'
  Set-EnvironmentSecret -Name 'R2_STAGING_SECRET_ACCESS_KEY' -Prompt 'Secret Access Key du credential staging'

  & node $scriptPath
  if ($LASTEXITCODE -ne 0) {
    throw "Le processus de test a echoue (code $LASTEXITCODE)."
  }
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}
finally {
  foreach ($name in $temporaryNames) {
    [Environment]::SetEnvironmentVariable($name, $previousValues[$name], 'Process')
  }
  $previousValues.Clear()
}
