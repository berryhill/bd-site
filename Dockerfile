# Build stage
FROM node:lts AS build
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# SSR Runtime stage
FROM node:lts-alpine AS runtime
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and install production deps only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy source files needed for live collections
COPY --from=build /app/src ./src

# Remove source blog directory and recreate it empty - will be mounted as volume
RUN rm -rf ./src/data/blog && mkdir -p ./src/data/blog

# Set environment variables
ENV PORT=80
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 80

# Start the SSR server
CMD ["node", "./dist/server/entry.mjs"]
