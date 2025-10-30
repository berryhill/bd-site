# berryhill.dev

Personal website and blog for Matt Berryhill - exploring agentic-first development, AI/ML systems, blockchain technologies, crypto markets, digital music, and intelligent automation.

## 🛠️ Local Development

### Workstation Mode (uses .env file)

```bash
# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
# Edit .env and add: X_API_KEY=$(openssl rand -hex 32)

# Run development server
pnpm run dev
```

Runs on `http://localhost:4321` with `ENV=workstation`.

### Production Mode (uses Doppler)

```bash
doppler login
doppler setup
pnpm run dev:prod
```

Uses Doppler for secrets management (same as production).

## 🚀 Tech Stack

**Framework** - [Astro](https://astro.build/) with SSR (Node adapter)
**Type Checking** - [TypeScript](https://www.typescriptlang.org/)
**Styling** - [TailwindCSS 4.x](https://tailwindcss.com/)
**Search** - [Pagefind](https://pagefind.app/)
**Deployment** - Kubernetes on Linode (LKE)
**Container** - Docker with Node.js runtime
**CI/CD** - GitHub Actions
**SSL/TLS** - Let's Encrypt via cert-manager
**Theme** - Based on [AstroPaper](https://github.com/satnaing/astro-paper)

## 🏗️ Architecture

This site runs as a server-side rendered (SSR) Astro application:

- **Runtime**: Node.js on port 80
- **Deployment**: Kubernetes with Helm charts
- **Storage**: PersistentVolume for blog content (externalized from container image)
- **Updates**: Zero-downtime rolling deployments with health checks
- **SSL**: Automatic TLS certificate provisioning via cert-manager

## 📁 Project Structure

```bash
/
├── helm/                    # Kubernetes Helm charts
│   ├── templates/
│   │   ├── deployment.yaml  # K8s deployment with rolling updates
│   │   ├── service.yaml     # ClusterIP service
│   │   ├── ingress.yaml     # NGINX ingress with TLS
│   │   ├── pvc.yaml         # PersistentVolumeClaim for blog content
│   │   └── clusterissuer.yaml # Let's Encrypt issuer
│   └── values.yaml          # Helm configuration
├── src/
│   ├── components/          # Astro components
│   ├── data/blog/          # Blog posts (Markdown)
│   ├── layouts/            # Page layouts
│   ├── pages/              # Routes and API endpoints
│   ├── styles/             # Global CSS and typography
│   └── utils/              # Utility functions
├── Dockerfile              # Multi-stage Docker build for SSR
├── nginx.conf              # NGINX config (for reference)
└── astro.config.ts         # Astro SSR configuration
```

## 💻 Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (localhost:4321)
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Type checking
pnpm run sync

# Linting and formatting
pnpm run lint
pnpm run format
```

## 🐳 Docker

Build and run with Docker:

```bash
# Build the image
docker build -t berryhill/bd-site:latest .

# Run the container (SSR on port 80)
docker run -p 8080:80 berryhill/bd-site:latest
```

Access at http://localhost:8080

## ☸️ Kubernetes Deployment

Deploy to Kubernetes using Helm:

```bash
# Install/upgrade the release
helm upgrade --install bd-site ./helm

# With custom values
helm upgrade --install bd-site ./helm -f ./helm/values.yaml

# Check deployment status
kubectl get pods -l app=bd-site
kubectl logs -l app=bd-site -f
```

### Configuration

Key values in `helm/values.yaml`:

```yaml
replicaCount: 1
image:
  repository: ghcr.io/berryhill/bd-site
  tag: 0.0.3
service:
  port: 80
  targetPort: 80
ingress:
  host: berryhill.dev
volumes:
  postsContent:
    enabled: true
    pvcName: bd-site-posts-pvc
    size: 1Gi
```

## 🔐 Environment Variables

Optional environment variables:

```bash
# Google Search Console verification
PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code

# Server configuration (defaults shown)
PORT=80
HOST=0.0.0.0
NODE_ENV=production
```

## 📝 Blog Content Management

Blog posts are stored as Markdown files in `src/data/blog/`. In production, the posts directory is mounted as a PersistentVolume, allowing content updates without rebuilding the container.

To update blog content in production:
1. Content is stored on the PVC `bd-site-posts-pvc`
2. Update files on the PVC
3. Pod restarts pick up new content automatically

## 🚢 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yaml`):
1. Build Docker image
2. Push to GitHub Container Registry (GHCR)
3. Deploy to Kubernetes via Helm

## 🎨 Features

- Server-side rendering for optimal SEO
- Zero-downtime rolling deployments
- Automatic TLS certificate management
- Persistent blog content storage
- Terminal-style typing animations
- Interactive pillar modals
- Dark/light mode toggle
- Fuzzy search with Pagefind
- RSS feed and sitemap
- Dynamic OG image generation

## 📜 License

MIT License - Copyright © 2025 Matt Berryhill

Originally based on [AstroPaper](https://github.com/satnaing/astro-paper) by Sat Naing
