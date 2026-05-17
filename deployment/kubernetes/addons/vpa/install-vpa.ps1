param(
    [string]$VpaVersion = "1.6.0"
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

Require-Command kubectl
Require-Command openssl

$baseUrl = "https://raw.githubusercontent.com/kubernetes/autoscaler/vertical-pod-autoscaler-$VpaVersion/vertical-pod-autoscaler/deploy"
$components = @(
    "vpa-v1-crd-gen.yaml",
    "vpa-rbac.yaml",
    "updater-deployment.yaml",
    "recommender-deployment.yaml",
    "admission-controller-service.yaml"
)

foreach ($component in $components) {
    Invoke-Native -Command kubectl -Arguments @("apply", "-f", "$baseUrl/$component")
}

$tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vpa-certs-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpRoot | Out-Null

try {
    $caConf = Join-Path $tmpRoot "ca.conf"
    @"
[req]
prompt = no
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
[req_distinguished_name]
CN = vpa_webhook_ca
[v3_ca]
subjectAltName = DNS:vpa_webhook_ca
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
"@ | Set-Content -Path $caConf -Encoding ascii

    $serverConf = Join-Path $tmpRoot "server.conf"
    @"
[req]
prompt = no
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
CN = vpa-webhook.kube-system.svc
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
subjectAltName = DNS:vpa-webhook.kube-system.svc
"@ | Set-Content -Path $serverConf -Encoding ascii

    $caKey = Join-Path $tmpRoot "caKey.pem"
    $caCert = Join-Path $tmpRoot "caCert.pem"
    $serverKey = Join-Path $tmpRoot "serverKey.pem"
    $serverCsr = Join-Path $tmpRoot "server.csr"
    $serverCert = Join-Path $tmpRoot "serverCert.pem"

    Invoke-Native -Command openssl -Arguments @("genrsa", "-out", $caKey, "2048")
    Invoke-Native -Command openssl -Arguments @("req", "-x509", "-new", "-nodes", "-key", $caKey, "-days", "100000", "-out", $caCert, "-config", $caConf)
    Invoke-Native -Command openssl -Arguments @("genrsa", "-out", $serverKey, "2048")
    Invoke-Native -Command openssl -Arguments @("req", "-new", "-key", $serverKey, "-out", $serverCsr, "-config", $serverConf)
    Invoke-Native -Command openssl -Arguments @("x509", "-req", "-in", $serverCsr, "-CA", $caCert, "-CAkey", $caKey, "-CAcreateserial", "-out", $serverCert, "-days", "100000", "-extensions", "v3_req", "-extfile", $serverConf)

    $secretManifest = & kubectl create secret generic vpa-tls-certs `
        --namespace kube-system `
        --from-file="caKey.pem=$caKey" `
        --from-file="caCert.pem=$caCert" `
        --from-file="serverKey.pem=$serverKey" `
        --from-file="serverCert.pem=$serverCert" `
        --dry-run=client `
        -o yaml
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to render vpa-tls-certs secret manifest."
    }

    $secretManifest | & kubectl apply -f -
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to apply vpa-tls-certs secret."
    }
}
finally {
    Remove-Item -Path $tmpRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Invoke-Native -Command kubectl -Arguments @("apply", "-f", "$baseUrl/admission-controller-deployment.yaml")
Invoke-Native -Command kubectl -Arguments @("rollout", "restart", "deployment/vpa-admission-controller", "-n", "kube-system")
Invoke-Native -Command kubectl -Arguments @("rollout", "status", "deployment/vpa-admission-controller", "-n", "kube-system", "--timeout=180s")

Invoke-Native -Command kubectl -Arguments @("get", "pods", "-n", "kube-system", "-l", "app=vpa-admission-controller")
