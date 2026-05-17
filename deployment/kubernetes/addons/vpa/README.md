# Vertical Pod Autoscaler Addon

This folder installs the cluster-level VPA components required by the
`VerticalPodAutoscaler` resources under `deployment/kubernetes/base/vpa`.

Run from the repository root:

```powershell
.\deployment\kubernetes\addons\vpa\install-vpa.ps1
kubectl apply -k deployment/kubernetes/overlays/prod
kubectl get vpa -n investadvisor
```

The script installs VPA 1.6.0 controller manifests from the upstream Kubernetes
autoscaler repository and creates the `kube-system/vpa-tls-certs` secret needed
by `vpa-admission-controller`.
