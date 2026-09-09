# Helm Deployment with Doppler

This deployment uses [Doppler](https://doppler.com) for secrets management. All environment variables are managed through Doppler and injected at runtime.

## Prerequisites

1. **Doppler Account**: Sign up at https://doppler.com
2. **Doppler CLI** (for local setup): `brew install dopplerhq/cli/doppler` or see https://docs.doppler.com/docs/install-cli
3. **Service Token**: Generate a service token from your Doppler project

## Setup Doppler Project

### 1. Create Doppler Project

```bash
doppler login
doppler projects create bd-site
doppler setup
```

### 2. Add Environment Variables to Doppler

```bash
# Navigate to your Doppler dashboard or use CLI
doppler secrets set X_API_KEY="$(openssl rand -hex 32)"
doppler secrets set PUBLIC_GOOGLE_SITE_VERIFICATION="your-verification-code"
doppler secrets set PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### 3. Generate Service Token

In Doppler dashboard:
1. Go to your project → Access
2. Create a **Service Token** for production
3. Store the token through approved credential custody; do not add it to this repository

## Deploy to Kubernetes

### Method 1: Use the runtime Kubernetes Secret

The Deployment reads `DOPPLER_TOKEN` from the `bd-site-doppler` Secret's
`token` key. Reconcile that Secret from an approved protected credential file;
do not put the token in a values file, Helm argument, rendered manifest, or
shell output:

```bash
DOPPLER_TOKEN_PATH=/path/to/protected/doppler-token
test -s "${DOPPLER_TOKEN_PATH}"
test "$(stat -c '%a' "${DOPPLER_TOKEN_PATH}")" = "600"
kubectl create secret generic bd-site-doppler \
  --from-file="token=${DOPPLER_TOKEN_PATH}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Then deploy only non-secret values through Helm:

```bash
REVISION="$(git rev-parse HEAD)"

helm upgrade --install bd-site ./helm \
  -f helm/values.yaml \
  --set image.tag="${REVISION}" \
  --set deploymentRevision="${REVISION}" \
  --namespace default

kubectl rollout status deployment/bd-site --timeout=180s
```

For manual deployments, use the same immutable revision value for both `image.tag` and `deploymentRevision`. This mirrors the GitHub Actions main-branch contract, where the image tag is the exact `GITHUB_SHA` and the chart receives that same revision for the pod-template annotation.

### Preserve the rollback PVC independently of mounting

The chart defaults to the current filesystem-backed production behavior:

```yaml
contentStorage:
  mode: filesystem
  multiReplicaConcurrencySafe: false
  filesystem:
    directory: /app/src/data/blog
    pvc:
      create: true
      mount: true
      existingClaim: bd-site-posts-pvc
      preserveOnDelete: true
```

`mode` controls storage and rollout behavior. `filesystem`, `filesystem-mirror`, and `object-mirror` require exactly one replica and use `Recreate`; by default they mount the retained claim. `object` keeps the PVC resource but renders no content `volumeMount`, content volume, or `emptyDir`; it uses `RollingUpdate` with `maxUnavailable: 0` and `maxSurge: 1`. `create` controls whether Helm renders the PVC, while `mount` independently controls whether filesystem-backed modes attach it. With `create: true` and `mount: false`, Helm retains the rollback claim but renders no posts content mount, volume, or `emptyDir`. Set `create: false` only when `existingClaim` is managed outside this release.

Object mode still defaults to one replica. A replica count above one fails chart rendering unless `contentStorage.multiReplicaConcurrencySafe=true` is set explicitly after the object-store concurrency contract has passed. Filesystem and mirror modes reject every replica count other than one.

The Deployment sends process-only liveness and startup probes to the exact, unsuffixed `/livez` path. Storage outages therefore remove a pod from service through the exact `/readyz` path without creating liveness restart storms. Both routes are unauthenticated JSON machine endpoints, bypass canonical HTML redirects, and set `Cache-Control: no-store`; `/readyz` also returns `Retry-After: 30` when unavailable. `/readyz` checks only the configured primary store; mirror readiness never falls back to the secondary. It also checks the admitted migration state, writer epoch, and optional expected object-catalog generation. Non-secret readiness diagnostics include storage mode, catalog generation, CAS-conflict count, mirror lag, parity mismatch, write-freeze state, and restore timestamp. Authenticated `/api/health` remains the API credential and API-oriented storage-status check; it is not used for Kubernetes probes.

The following values are non-secret runtime wiring. The Doppler Secret name and
key are selectors, not credential values. Object credentials remain
Doppler/runtime-only and must not be added to values files:

```yaml
runtimeSecrets:
  doppler:
    name: bd-site-doppler
    key: token
contentStorage:
  object:
    bucket: ""
    prefix: bd-site/content/v1
    region: ""
    endpoint: ""
    forcePathStyle: false
    requestTimeoutMs: 5000
    maxAttempts: 3
  migration:
    state: steady
    requiredState: steady
    writerEpoch: "1"
    requiredWriterEpoch: "1"
    expectedCatalogGeneration: ""
```

`preserveOnDelete: true` applies `helm.sh/resource-policy: keep` to a chart-created PVC. That protects the claim from Helm deletion; the backing PV remains governed by its Kubernetes reclaim policy. Before any object-storage migration, use credential-safe metadata readback and require `Retain`:

```bash
NAMESPACE=default
CLAIM=bd-site-posts-pvc
PV_NAME="$(kubectl get pvc "${CLAIM}" -n "${NAMESPACE}" -o jsonpath='{.spec.volumeName}')"
test -n "${PV_NAME}"
kubectl get pv "${PV_NAME}" -o jsonpath='{.metadata.name}{"\t"}{.spec.persistentVolumeReclaimPolicy}{"\n"}'
```

If the policy is not `Retain`, stop before migration and route the policy change to the cluster operator. Do not print kubeconfig, Doppler values, or Kubernetes Secret content as verification.

### Method 2: Select an operator-managed runtime Secret

If an operator uses a differently named Secret or key, pass only those
non-secret selectors to Helm. The referenced Secret must already exist:

```bash
REVISION="$(git rev-parse HEAD)"

helm upgrade --install bd-site ./helm \
  --set runtimeSecrets.doppler.name="operator-managed-doppler" \
  --set runtimeSecrets.doppler.key="token" \
  --set image.tag="${REVISION}" \
  --set deploymentRevision="${REVISION}" \
  --namespace default

kubectl rollout status deployment/bd-site --timeout=180s
```

## How It Works

1. **Docker Image**: Includes Doppler CLI installed in Alpine Linux
2. **Entrypoint**: `doppler run --` wraps the Node.js server
3. **Environment Variables**: Doppler fetches secrets and injects them as environment variables
4. **Revision-tagged rollout**: Main-branch CI builds `ghcr.io/berryhill/bd-site-app:${GITHUB_SHA}` and passes the same value as both `image.tag` and `deploymentRevision`; manual deploys should do the same with the immutable revision being deployed
5. **Pod-template annotation**: The chart writes `berryhill.dev/deployment-revision` to the Deployment pod template, forcing Kubernetes to create replacement pods when the deployed revision changes
6. **Rollout gate**: `kubectl rollout status deployment/bd-site --timeout=180s` must complete before live checks are treated as verification
7. **Runtime**: Application reads environment variables normally (no code changes needed)

## Environment Variables Required

The application expects these variables in Doppler:

- `X_API_KEY` - API authentication key (required)
- `PUBLIC_GOOGLE_SITE_VERIFICATION` - Google Search Console verification (optional)
- `PUBLIC_GA_MEASUREMENT_ID` - Google Analytics 4 tracking ID (optional)

## Local Development

The application supports two modes:

### Workstation Mode (Default - uses .env file)
```bash
# Create .env file
echo "X_API_KEY=$(openssl rand -hex 32)" >> .env
echo "PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX" >> .env

# Run dev server (ENV=workstation is set automatically)
pnpm run dev
```

### Production Mode (uses Doppler)
```bash
# Setup Doppler locally first
doppler login
doppler setup

# Run with Doppler
pnpm run dev:prod
```

The `ENV` environment variable controls the mode:
- `ENV=workstation` → Uses `.env` file
- `ENV=prod` → Uses Doppler (set automatically in Docker)

## Security Notes

- ⚠️ **Never commit service tokens to git**
- ⚠️ Use separate Doppler environments for dev/staging/production
- ⚠️ Rotate service tokens regularly
- ⚠️ Use Doppler's audit logs to track secret access

## Troubleshooting

### Check if Doppler is working in container:

```bash
# Verify the Secret reference and runtime injection without reading the value
kubectl get secret bd-site-doppler
kubectl get deployment bd-site \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="DOPPLER_TOKEN")].valueFrom.secretKeyRef}{"\n"}'
kubectl exec deployment/bd-site -- sh -c 'test -n "${DOPPLER_TOKEN:-}"'
```

### Check application logs:

```bash
kubectl logs -f <pod-name>
```

### Verify a revision-tagged rollout:

```bash
REVISION="<immutable-git-revision>"

# Deployment uses the expected image tag
kubectl get deployment bd-site -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

# Pod template carries the rollout-forcing revision annotation
kubectl get deployment bd-site -o jsonpath='{.spec.template.metadata.annotations.berryhill\.dev/deployment-revision}{"\n"}'

# Rollout completed and replacement pod exists for the revision
kubectl rollout status deployment/bd-site --timeout=180s
kubectl get pods -l app=bd-site -o wide

# Live crawl/social-preview checks after rollout completion
curl -fsS https://berryhill.dev/livez | grep -Fq '"status":"alive"'
curl -fsS https://berryhill.dev/readyz | grep -Fq '"status":"ready"'
curl -fsS https://berryhill.dev/robots.txt | grep -A2 '^User-agent: Twitterbot$'
curl -fsSI https://berryhill.dev/posts/<post-slug>/index.png
pnpm run check:social-preview -- https://berryhill.dev/posts/<post-slug>/
```

The live X card is not verified by deployment success alone. Confirm the dedicated Twitterbot robots group, the post metadata, the advertised image URL status and image content type, and social-preview readiness against the deployed URL before calling it live. Do not print or commit Doppler tokens while troubleshooting.

## Resources

- [Doppler Documentation](https://docs.doppler.com)
- [Doppler Kubernetes Guide](https://docs.doppler.com/docs/kubernetes)
