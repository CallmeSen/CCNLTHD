param(
  [string]$Namespace = "investadvisor",
  [string]$BackendEnvPath = "Main_Project/Backend/.env",
  [string]$MultiAgentsEnvPath = "Main_Project/Backend/multi-agents-service/.env",
  [string]$FrontendEnvPath = "Main_Project/Frontend/.env",
  [switch]$Restart
)

$ErrorActionPreference = "Stop"

function Read-DotEnv {
  param([string]$Path)

  $values = [ordered]@{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*$' -or $line -match '^\s*#') {
      continue
    }

    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$key] = $value
    }
  }

  return $values
}

function Get-EnvValue {
  param(
    [hashtable[]]$Sources,
    [string]$Key,
    [string]$Default = ""
  )

  foreach ($source in $Sources) {
    if ($source.Contains($Key) -and $source[$Key] -ne "") {
      return $source[$Key]
    }
  }

  $processValue = [Environment]::GetEnvironmentVariable($Key)
  if ($processValue) {
    return $processValue
  }

  return $Default
}

function Require-EnvValue {
  param(
    [hashtable[]]$Sources,
    [string]$Key
  )

  $value = Get-EnvValue -Sources $Sources -Key $Key
  if (-not $value) {
    throw "Missing required env value: $Key"
  }
  return $value
}

function Write-EnvFile {
  param(
    [string]$Path,
    [hashtable]$Values
  )

  $lines = foreach ($key in ($Values.Keys | Sort-Object)) {
    "$key=$($Values[$key])"
  }
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllLines((Resolve-Path -LiteralPath $Path), $lines, $utf8NoBom)
}

function Apply-FromEnvFile {
  param(
    [string]$Kind,
    [string]$Name,
    [hashtable]$Values
  )

  $temp = New-TemporaryFile
  try {
    Write-EnvFile -Path $temp.FullName -Values $Values
    if ($Kind -eq "secret") {
      kubectl create secret generic $Name -n $Namespace --from-env-file $temp.FullName --dry-run=client -o yaml | kubectl apply -f -
    } elseif ($Kind -eq "configmap") {
      kubectl create configmap $Name -n $Namespace --from-env-file $temp.FullName --dry-run=client -o yaml | kubectl apply -f -
    } else {
      throw "Unsupported kind: $Kind"
    }
  } finally {
    Remove-Item -LiteralPath $temp.FullName -Force -ErrorAction SilentlyContinue
  }

  kubectl annotate $Kind $Name -n $Namespace `
    "argocd.argoproj.io/sync-options=Prune=false" `
    "argocd.argoproj.io/compare-options=IgnoreExtraneous" `
    --overwrite | Out-Null
  kubectl annotate $Kind $Name -n $Namespace "argocd.argoproj.io/tracking-id-" --overwrite 2>$null | Out-Null
}

$backend = Read-DotEnv -Path $BackendEnvPath
$multi = Read-DotEnv -Path $MultiAgentsEnvPath
$frontend = Read-DotEnv -Path $FrontendEnvPath

$dbPassword = Get-EnvValue -Sources @($backend) -Key "DB_PASSWORD" -Default (Get-EnvValue -Sources @($backend) -Key "POSTGRES_PASSWORD")
if (-not $dbPassword) {
  throw "Missing DB_PASSWORD or POSTGRES_PASSWORD in backend env"
}

$postgresMaPassword = Get-EnvValue -Sources @($backend, $multi) -Key "POSTGRES_MA_PASSWORD" -Default (Get-EnvValue -Sources @($multi) -Key "POSTGRES_PASSWORD" -Default $dbPassword)
$multiPostgresUser = Get-EnvValue -Sources @($multi) -Key "POSTGRES_USER" -Default "user"
$multiPostgresDb = Get-EnvValue -Sources @($multi) -Key "POSTGRES_DB" -Default "financial_advisor"
$databaseUrl = "postgresql://${multiPostgresUser}:${postgresMaPassword}@postgres-ma.${Namespace}.svc.cluster.local:5432/${multiPostgresDb}"

$backendSecrets = [ordered]@{
  JWT_SECRET = Require-EnvValue -Sources @($backend) -Key "JWT_SECRET"
  DB_PASSWORD = $dbPassword
  POSTGRES_MA_PASSWORD = $postgresMaPassword
  DATABASE_URL = $databaseUrl
  OPENROUTER_API_KEY = Get-EnvValue -Sources @($backend, $multi) -Key "OPENROUTER_API_KEY"
  OPENAI_API_KEY = Get-EnvValue -Sources @($backend, $multi) -Key "OPENAI_API_KEY"
  TAVILY_API_KEY = Get-EnvValue -Sources @($backend, $multi) -Key "TAVILY_API_KEY"
  VNSTOCK_API_KEY = Get-EnvValue -Sources @($backend, $multi) -Key "VNSTOCK_API_KEY"
  LANGCHAIN_API_KEY = Get-EnvValue -Sources @($backend, $multi) -Key "LANGCHAIN_API_KEY"
}
$backendDbUser = Get-EnvValue -Sources @($backend) -Key "DB_USERNAME" -Default (Get-EnvValue -Sources @($backend) -Key "POSTGRES_USER")
if ($backendDbUser) {
  $backendSecrets["POSTGRES_USER"] = $backendDbUser
  $backendSecrets["POSTGRES_PASSWORD"] = $dbPassword
}

$multiSecrets = [ordered]@{
  DATABASE_URL = $databaseUrl
  POSTGRES_PASSWORD = $postgresMaPassword
  OPENROUTER_API_KEY = Get-EnvValue -Sources @($multi, $backend) -Key "OPENROUTER_API_KEY"
  OPENAI_API_KEY = Get-EnvValue -Sources @($multi, $backend) -Key "OPENAI_API_KEY"
  TAVILY_API_KEY = Get-EnvValue -Sources @($multi, $backend) -Key "TAVILY_API_KEY"
  SECRET_KEY = Get-EnvValue -Sources @($multi, $backend) -Key "SECRET_KEY" -Default (Require-EnvValue -Sources @($backend) -Key "JWT_SECRET")
}

foreach ($key in @(
  "POSTGRES_USER",
  "POSTGRES_DB",
  "SERPER_API_KEY",
  "BROWSERLESS_API_KEY",
  "SEC_API_API_KEY",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "LLM_MAX_TOKENS",
  "ACCESS_TOKEN_EXPIRE_MINUTES"
)) {
  $value = Get-EnvValue -Sources @($multi, $backend) -Key $key
  if ($value) {
    $multiSecrets[$key] = $value
  }
}

$mailSecrets = [ordered]@{
  MAIL_USERNAME = Get-EnvValue -Sources @($backend) -Key "MAIL_USERNAME"
  MAIL_PASSWORD = Get-EnvValue -Sources @($backend) -Key "MAIL_PASSWORD"
}

$frontendConfig = [ordered]@{}
foreach ($key in $frontend.Keys) {
  if ($key -like "VITE_*") {
    $frontendConfig[$key] = $frontend[$key]
  }
}
if (
  $frontendConfig.Contains("VITE_API_URL") -and
  ($frontendConfig["VITE_API_URL"] -match '^https?://(localhost|127\.0\.0\.1)(:|/|$)')
) {
  $frontendConfig["LOCAL_VITE_API_URL_FROM_ENV"] = $frontendConfig["VITE_API_URL"]
  $frontendConfig["VITE_API_URL"] = "/api"
}
if (-not $frontendConfig.Contains("VITE_API_URL")) {
  $frontendConfig["VITE_API_URL"] = "/api"
}
if (-not $frontendConfig.Contains("VITE_MOCK_API")) {
  $frontendConfig["VITE_MOCK_API"] = "false"
}

kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
Apply-FromEnvFile -Kind "secret" -Name "backend-secrets" -Values $backendSecrets
Apply-FromEnvFile -Kind "secret" -Name "multi-agents-secrets" -Values $multiSecrets
Apply-FromEnvFile -Kind "secret" -Name "mail-secrets" -Values $mailSecrets
Apply-FromEnvFile -Kind "configmap" -Name "frontend-env" -Values $frontendConfig

Write-Host "Applied Kubernetes env resources from .env files. Values hidden."
Write-Host "backend-secrets keys: $($backendSecrets.Keys -join ', ')"
Write-Host "multi-agents-secrets keys: $($multiSecrets.Keys -join ', ')"
Write-Host "mail-secrets keys: $($mailSecrets.Keys -join ', ')"
Write-Host "frontend-env keys: $($frontendConfig.Keys -join ', ')"

if ($Restart) {
  kubectl rollout restart statefulset/postgres-ma -n $Namespace
  kubectl rollout restart deployment/frontend -n $Namespace
  kubectl rollout restart deployment/api-gateway deployment/user-service deployment/market-data-service deployment/portfolio-service deployment/notification-service deployment/multi-agents-service -n $Namespace
}
