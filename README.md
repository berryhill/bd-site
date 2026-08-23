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
**Search** - [Pagefind](https://pagefind.app/) powers `/search`; generated `/pagefind/` assets are search-index implementation output, not crawler-facing content
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
- **Updates**: Health-checked `Recreate` deployments serialize access to the single-node `ReadWriteOnce` posts volume; main-branch CI tags the image with the exact `GITHUB_SHA`, passes that same value as `deploymentRevision`, uses the pod-template annotation to force a replacement pod, and waits for rollout completion before live verification
- **SSL**: Automatic TLS certificate provisioning via cert-manager
- **Analytics**: GA4 browser measurement is conditional on `PUBLIC_GA_MEASUREMENT_ID`; the editorial pageview contract is summarized here and owned in [`docs/ga4-editorial-analytics-contract.md`](docs/ga4-editorial-analytics-contract.md)

## 📁 Project Structure

```bash
/
├── helm/                    # Kubernetes Helm charts
│   ├── templates/
│   │   ├── deployment.yaml  # K8s deployment with RWO-safe replacement
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
├── public/assets/blog/      # Durable blog visuals by post slug
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

# Unit tests, linting, and formatting
pnpm test
pnpm run lint
pnpm run format

# Crawl/search visibility validation
pnpm run check:search-visibility
pnpm run check:seo-crawl-surface
pnpm run check:seo-crawl-surface -- --base-url https://berryhill.dev/
```

`pnpm run check:search-visibility` checks robots.txt, canonical `/sitemap.xml`, rss.xml, llms.txt, and representative JSON-LD.

`pnpm run check:seo-crawl-surface` validates local source and built crawl surfaces, including public post links, sitemap/canonical/feed URL shape, search noindex behavior, and legacy title-quality advisories.

The URL-based crawl audit verifies every HTML URL advertised by the live sitemap: the canonical URL must remain `200`, indexable, and self-canonical, while its non-canonical slash variant must return a permanent redirect. HTML routes use trailing slashes; file-like routes, feeds, sitemap XML, API routes, assets, and generated images keep their native URL behavior. A passing repository audit confirms the site's crawl contract, not Google's eventual indexing decision.

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

Deploy to Kubernetes using Helm. The default `helm/values.yaml` values are local/manual defaults; main-branch GitHub Actions deployments override them with the immutable Git revision:

```bash
# Manual equivalent of the CI deployment contract
REVISION="$(git rev-parse HEAD)"
helm upgrade --install bd-site ./helm \
  -f ./helm/values.yaml \
  --set image.tag="${REVISION}" \
  --set deploymentRevision="${REVISION}"

# Check deployment status before live verification
kubectl rollout status deployment/bd-site --timeout=180s
kubectl get pods -l app=bd-site
kubectl logs -l app=bd-site -f
```

### Configuration

Key values in `helm/values.yaml`:

```yaml
replicaCount: 1
image:
  repository: ghcr.io/berryhill/bd-site-app
  tag: 0.0.56
  pullPolicy: IfNotPresent
deploymentRevision: ""
service:
  name: bd-site
  type: ClusterIP
  port: 80
  targetPort: 80
ingress:
  host: berryhill.dev
contentStorage:
  filesystem:
    pvc:
      create: true
      mount: true
      existingClaim: bd-site-posts-pvc
      preserveOnDelete: true
      size: 25Gi
      storageClassName: ""
      accessMode: ReadWriteOnce
```

In CI, do not treat the static `image.tag` above as the deployment mechanism. The GitHub Actions workflow builds and pushes `ghcr.io/berryhill/bd-site-app:${GITHUB_SHA}`, then runs Helm with both `--set image.tag="${GITHUB_SHA}"` and `--set deploymentRevision="${GITHUB_SHA}"`. The chart writes `berryhill.dev/deployment-revision` onto the pod template, so a new commit changes the Deployment spec and forces Kubernetes to create replacement pods even when other values are unchanged.

### Filesystem rollback claim

The default filesystem mode creates and mounts the existing production claim name, `bd-site-posts-pvc`. `preserveOnDelete: true` adds Helm's `helm.sh/resource-policy: keep` annotation so uninstalling the release or later rendering the chart without the PVC does not delete the claim. This is the rollback source for a future object-storage cutover; do not migrate or delete its content as part of a deployment-mode change.

PVC creation and pod mounting are independent:

- Default filesystem mode: `create: true`, `mount: true`.
- Preserved-but-unmounted preparation: keep `create: true` and set `mount: false`. The claim remains rendered and retained, while the Deployment contains neither a posts `volumeMount` nor a posts `volume`; no `emptyDir` replacement is created.
- Operator-managed claim: set `create: false`, keep `mount: true`, and set `existingClaim` to the claim name. Helm does not create the PVC but the pod mounts that existing claim.

The Helm keep annotation protects the claim from Helm deletion, but it does not change the backing PersistentVolume's reclaim policy. Before any storage migration, verify that the claim is bound and record the backing PV policy without reading cluster credentials or secret data:

```bash
NAMESPACE=default
CLAIM=bd-site-posts-pvc
PV_NAME="$(kubectl get pvc "${CLAIM}" -n "${NAMESPACE}" -o jsonpath='{.spec.volumeName}')"
test -n "${PV_NAME}"
kubectl get pv "${PV_NAME}" -o jsonpath='{.metadata.name}{"\t"}{.spec.persistentVolumeReclaimPolicy}{"\n"}'
```

The migration prerequisite is an explicit `Retain` policy for the backing PV. If readback reports another policy, stop before cutover and have the cluster operator change and re-verify it; this repository change does not mutate production storage.

## 🔐 Environment Variables

Optional environment variables:

```bash
# Google Search Console verification
PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code

# Optional Google Analytics 4 browser measurement
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional server-side Google Search Console crawl signal submission
GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=secret-access-token
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://berryhill.dev/
GOOGLE_SEARCH_CONSOLE_SITEMAP_URL=https://berryhill.dev/sitemap.xml

# Optional DuckDuckGo crawl coverage evaluation opt-out
DUCKDUCKGO_CRAWL_SIGNAL_DISABLED=false

# Server configuration (defaults shown)
PORT=80
HOST=0.0.0.0
NODE_ENV=production
```

When `PUBLIC_GA_MEASUREMENT_ID` is unset, bd-site does not load GA4. When set, the shared layout configures GA4 with `send_page_view=false` and emits one guarded explicit `page_view` on `astro:page-load`, covering the initial load and Astro client navigation without automatic duplicate config pageviews. Article pageviews include stable editorial parameters for downstream analysis: `page_type`, `post_slug`, `canonical_post_path`, and `primary_tag`, alongside the standard page location/path/title values. See [`docs/ga4-editorial-analytics-contract.md`](docs/ga4-editorial-analytics-contract.md) for the full bd-site/Luca ownership boundary, normalization rules, parameter contract, and joined-model requirements.

## 📝 Blog Content Management

Blog posts are stored as Markdown files in `src/data/blog/`. In production, the posts directory is mounted as a PersistentVolume, allowing content updates without rebuilding the container.

API-created or API-updated non-draft posts trigger public crawl signals after the Markdown write: IndexNow performs immediate URL submission, Google uses supported Search Console sitemap resubmission, DuckDuckGo coverage is evaluated through Bing/IndexNow evidence plus canonical sitemap and DuckDuckBot access, and Yahoo-specific discovery evidence is returned through Bing IndexNow / Yahoo Slurp plus sitemap and robots visibility. DuckDuckGo and Yahoo evidence are not standalone direct submission endpoints and do not guarantee indexing. Draft posts are skipped.

API-created or API-updated non-draft posts also reject titles that produce overlong rendered `<title>` tags or near-duplicate recent public titles. The rendered title budget is 65 characters including the site suffix, so authors should budget for ` | berryhill.dev` instead of judging the raw frontmatter title alone. Draft posts skip this title-quality gate until made non-draft.

Durable local blog visuals belong under `public/assets/blog/<post-slug>/` and should be referenced from Markdown as `/assets/blog/<post-slug>/filename.svg` or `/assets/blog/<post-slug>/filename.png`. Use normal Markdown image syntax with useful alt text and a caption/title; inline `data:image` URIs are rejected.

### Blog social preview checks

Blog post pages emit `<title>`, meta description, Open Graph title/description/image, and Twitter card/title/description/image tags from the shared layout. The homepage document title remains `berryhill.dev`; the homepage Open Graph and Twitter titles use the dedicated social headline from `SITE.socialPreview.title` instead of replacing the browser title. The default homepage preview image resolves from `SITE.socialPreview.image` and is cache-versioned by `SITE.socialPreview.imageVersion`.

Homepage social metadata includes `og:type` `website`, `og:site_name`, the canonical social URL, `image/png`, 1200x630 image dimensions, and matching Open Graph/Twitter image alt text. Twitter metadata uses standards-correct `name` attributes. Post pages are distinct: they use `og:type` `article`, post-specific title/description, and post-specific image behavior. Per-post `ogImage` frontmatter, or the API `ogImage` / `featured_image` field, is rendered through `SITE.website`-normalized absolute URLs when it is relative or site-relative; custom absolute external image URLs remain absolute. When a published post has no custom `ogImage` and `SITE.dynamicOgImage` is enabled, the post preview image still resolves to `/posts/<slug>/index.png` and is generated dynamically. Draft posts and posts with a custom `ogImage` do not receive a dynamic `/index.png` image route.

For future Luca publishing checks, verify the built or previewed post URL before treating social previews as ready:

```bash
pnpm run build
pnpm run preview
pnpm run check:social-preview -- http://localhost:4321/posts/<post-slug>/
```

When the input is an HTTP(S) URL, `check:social-preview` validates the rendered metadata, fetches `/robots.txt`, evaluates the dedicated Twitterbot policy for both the post URL and advertised Open Graph/Twitter image URL, and then fetches the advertised image as Twitterbot. The URL check fails closed when either path is disallowed by robots.txt, when robots.txt cannot be fetched, or when the image is unreachable or does not return an image content type. The dedicated `User-agent: Twitterbot` `Allow: /` group intentionally overrides the generic generated-image restrictions so X can retrieve fresh social-card pages and PNG cards.

The check also accepts a built HTML file path, for example:

```bash
pnpm run check:social-preview -- dist/client/posts/<post-slug>/index.html
```

For local HTML-file input, `check:social-preview` is metadata-only: it verifies the file's title, description, Open Graph, and Twitter tags, but it cannot validate whether the advertised image endpoint is reachable. The command fails if required title/description/image metadata is missing or if Open Graph and Twitter values disagree. The generated site and post preview images use the shared terminal/operator brand template in `src/utils/og-templates/brand.js`, rendered through `site.js` and `post.js`. Keep `/og.png` and dynamic post `/index.png` previews aligned with the live berryhill.dev brand system rather than reverting to generic AstroPaper-style palette/layouts. The homepage card should stay simplified around one berryhill.dev brand mark, the dedicated social headline, restrained operator/shipped-systems/review-gates support copy, complete image metadata/alt, and no shell-command/status-pill/raw-URL clutter; post-specific cards must remain article-specific.

Adjacent SEO validation also includes title-quality readback through `pnpm run check:seo-crawl-surface`. That command reports legacy public title-quality advisories while preserving crawl/link URL failures as hard failures.

To update blog content in production:

1. Content is stored on the PVC `bd-site-posts-pvc`
2. Update files on the PVC
3. Pod restarts pick up new content automatically

## 🚢 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yaml`):

1. Resolve an immutable deployment tag from `GITHUB_SHA` and fail if it is missing.
2. Build and push `ghcr.io/berryhill/bd-site-app:${GITHUB_SHA}` to GitHub Container Registry (GHCR).
3. Deploy to Kubernetes via Helm with `image.tag=${GITHUB_SHA}` and `deploymentRevision=${GITHUB_SHA}`.
4. Let the chart place `berryhill.dev/deployment-revision: "${GITHUB_SHA}"` on the pod template so Kubernetes performs a rollout for the new revision.
5. Wait for `kubectl rollout status deployment/bd-site --timeout=180s` to complete before any live URL verification is treated as meaningful.

## 🎨 Features

- Server-side rendering for optimal SEO
- RWO-safe, health-checked replacement deployments
- Automatic TLS certificate management
- Persistent blog content storage
- Durable repo-backed blog visuals under `/assets/blog/<post-slug>/`
- Terminal-style typing animations
- Interactive pillar modals
- Dark/light mode toggle
- Fuzzy search with Pagefind (`/search`; generated `/pagefind/` assets are not crawler-facing content)
- Conditional GA4 editorial analytics: `PUBLIC_GA_MEASUREMENT_ID` enables GA4, automatic config pageviews stay disabled with `send_page_view=false`, and the shared layout emits one guarded explicit `page_view` per `astro:page-load` with article editorial parameters. The full analytics contract lives in [`docs/ga4-editorial-analytics-contract.md`](docs/ga4-editorial-analytics-contract.md).
- RSS feed plus canonical `/sitemap.xml` crawler surface (`/sitemap-index.xml` redirects only for compatibility), with public-post crawl signal submission on API publish/update; Google Search Console submission is best-effort and configuration-dependent, DuckDuckGo coverage is evaluated through Bing/IndexNow plus sitemap/DuckDuckBot discovery, and Yahoo discovery evidence is surfaced through Bing IndexNow / Yahoo Slurp without a Yahoo-specific environment variable
- Dynamic OG image generation through shared terminal/operator brand templates for site and post social previews. The homepage document title remains `berryhill.dev`, while Open Graph/Twitter use `SITE.socialPreview.title`; the default homepage image URL is versioned through `SITE.socialPreview.imageVersion` and carries image/png, 1200x630, canonical social URL, site name, and matching alt metadata. Post pages preserve article-specific titles and images, including custom `ogImage` overrides and dynamic `/posts/<slug>/index.png` fallback behavior. URL-based social-preview checks fetch robots.txt, verify Twitterbot access to both the post URL and advertised image URL, and rely on the dedicated Twitterbot allow group so X social-card retrieval is not blocked by generic generated-image disallows.

## 📜 License

MIT License - Copyright © 2025 Matt Berryhill

Originally based on [AstroPaper](https://github.com/satnaing/astro-paper) by Sat Naing
