# Build stage
FROM node:lts AS build
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and pnpm build-approval policy
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .

# Accept .env content as base64 encoded build argument and decode it
ARG DOT_ENV
RUN if [ -n "$DOT_ENV" ]; then echo "$DOT_ENV" | base64 -d > .env; fi

RUN pnpm run build

# SSR Runtime stage
FROM node:lts-alpine AS runtime
WORKDIR /app

# Install Doppler CLI
RUN apk add --no-cache ca-certificates && \
    wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub && \
    echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' | tee -a /etc/apk/repositories && \
    apk add doppler

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and pnpm build-approval policy, then install production deps only
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy source files needed for live collections
COPY --from=build /app/src ./src

# Keep repo-backed blog content in the image. The live collection reads
# ./src/data/blog at runtime; deleting it makes a healthy deploy appear empty
# whenever the Kubernetes content PVC is empty, stale, or disabled.
RUN mkdir -p ./src/data/blog

# Set environment variables
ENV PORT=80
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV ENV=prod

EXPOSE 80

# Start the SSR server with Doppler
ENTRYPOINT ["doppler", "run", "--"]
CMD ["node", "./dist/server/entry.mjs"]
