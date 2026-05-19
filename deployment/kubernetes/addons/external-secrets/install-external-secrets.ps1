param(
    [string]$ReleaseName = "external-secrets",
    [string]$ChartName = "external-secrets/external-secrets",
    [string]$ChartVersion = "2.4.1",
    [string]$ChartRepoName = "external-secrets",
    [string]$ChartRepoUrl = "https://charts.external-secrets.io",
    [string]$HashiCorpChartRepoName = "hashicorp",
    [string]$HashiCorpChartRepoUrl = "https://helm.releases.hashicorp.com",
    [string]$ExternalSecretsNamespace = "external-secrets",
    [string]$VaultNamespace = "vault",
    [string]$Timeout = "5m"
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [string[]]$Arguments = @()
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
    }
}

Require-Command helm
Require-Command kubectl

Invoke-Native -Command helm -Arguments @("repo", "add", $ChartRepoName, $ChartRepoUrl, "--force-update")
Invoke-Native -Command helm -Arguments @("repo", "add", $HashiCorpChartRepoName, $HashiCorpChartRepoUrl, "--force-update")
Invoke-Native -Command helm -Arguments @("repo", "update")

$vaultNamespaceManifest = & kubectl create namespace $VaultNamespace --dry-run=client -o yaml
if ($LASTEXITCODE -ne 0) {
    throw "Failed to render namespace manifest for '$VaultNamespace'."
}

$vaultNamespaceManifest | & kubectl apply -f -
if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply namespace '$VaultNamespace'."
}

Invoke-Native -Command helm -Arguments @(
    "upgrade",
    "--install",
    $ReleaseName,
    $ChartName,
    "--version",
    $ChartVersion,
    "--namespace",
    $ExternalSecretsNamespace,
    "--create-namespace",
    "--set",
    "installCRDs=true",
    "--wait",
    "--timeout",
    $Timeout
)

Invoke-Native -Command kubectl -Arguments @("get", "namespace", $ExternalSecretsNamespace, $VaultNamespace)
Invoke-Native -Command kubectl -Arguments @("get", "pods", "-n", $ExternalSecretsNamespace)
Invoke-Native -Command helm -Arguments @("status", $ReleaseName, "-n", $ExternalSecretsNamespace)
