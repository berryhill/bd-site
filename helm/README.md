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

### Method 1: Using Helm Values File (Recommended for CI/CD)

Create `helm/values.prod.yaml`:

```yaml
dopplerToken: "dp.st.prod.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Deploy:

```bash
helm upgrade --install bd-site ./helm \
  -f helm/values.yaml \
  -f helm/values.prod.yaml \
  --namespace default
```

### Method 2: Using Helm CLI Argument

```bash
helm upgrade --install bd-site ./helm \
  --set dopplerToken="dp.st.prod.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --namespace default
```

## How It Works

1. **Docker Image**: Includes Doppler CLI installed in Alpine Linux
2. **Entrypoint**: `doppler run --` wraps the Node.js server
3. **Environment Variables**: Doppler fetches secrets and injects them as environment variables
4. **Runtime**: Application reads environment variables normally (no code changes needed)

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

## Resources

- [Doppler Documentation](https://docs.doppler.com)
- [Doppler Kubernetes Guide](https://docs.doppler.com/docs/kubernetes)
