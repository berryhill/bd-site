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
3. Copy the token (starts with `dp.st.`)

## Deploy to Kubernetes

### Method 1: Using Helm Values File

Create `helm/values.prod.yaml`:

```yaml
dopplerToken: "dp.st.prod.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Deploy:

```bash
REVISION="$(git rev-parse HEAD)"

helm upgrade --install bd-site ./helm \
  -f helm/values.yaml \
  -f helm/values.prod.yaml \
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
  filesystem:
    pvc:
      create: true
      mount: true
      existingClaim: bd-site-posts-pvc
      preserveOnDelete: true
```

`create` controls whether Helm renders the PVC. `mount` independently controls whether the Deployment renders `/app/src/data/blog` as a `volumeMount` and matching PVC volume. With `create: true` and `mount: false`, Helm preserves the claim as a rollback source but the application pod has no posts-content volume. The chart never substitutes `emptyDir` when mounting is disabled. Set `create: false` only when `existingClaim` is managed outside this release.

`preserveOnDelete: true` applies `helm.sh/resource-policy: keep` to a chart-created PVC. That protects the claim from Helm deletion; the backing PV remains governed by its Kubernetes reclaim policy. Before any object-storage migration, use credential-safe metadata readback and require `Retain`:

```bash
NAMESPACE=default
CLAIM=bd-site-posts-pvc
PV_NAME="$(kubectl get pvc "${CLAIM}" -n "${NAMESPACE}" -o jsonpath='{.spec.volumeName}')"
test -n "${PV_NAME}"
kubectl get pv "${PV_NAME}" -o jsonpath='{.metadata.name}{"\t"}{.spec.persistentVolumeReclaimPolicy}{"\n"}'
```

If the policy is not `Retain`, stop before migration and route the policy change to the cluster operator. Do not print kubeconfig, Doppler values, or Kubernetes Secret content as verification.

### Method 2: Using Helm CLI Argument

```bash
REVISION="$(git rev-parse HEAD)"

helm upgrade --install bd-site ./helm \
  --set dopplerToken="dp.st.prod.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
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
# Exec into pod
kubectl exec -it <pod-name> -- sh

# Verify Doppler token
echo $DOPPLER_TOKEN

# Test Doppler CLI
doppler secrets
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
curl -fsS https://berryhill.dev/robots.txt | grep -A2 '^User-agent: Twitterbot$'
curl -fsSI https://berryhill.dev/posts/<post-slug>/index.png
pnpm run check:social-preview -- https://berryhill.dev/posts/<post-slug>/
```

The live X card is not verified by deployment success alone. Confirm the dedicated Twitterbot robots group, the post metadata, the advertised image URL status and image content type, and social-preview readiness against the deployed URL before calling it live. Do not print or commit Doppler tokens while troubleshooting.

## Resources

- [Doppler Documentation](https://docs.doppler.com)
- [Doppler Kubernetes Guide](https://docs.doppler.com/docs/kubernetes)
