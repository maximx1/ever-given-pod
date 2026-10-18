# syntax=docker/dockerfile:1
#
# One image that runs the whole app, with ffmpeg included for splitting long uploads.
# Debian-based on purpose: bcrypt and sharp ship prebuilt binaries for glibc, so nothing
# here needs a compiler. Dependencies are installed inside the image, for the image's
# platform, never copied from the host.

# ---- build the app ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The public address is baked into the browser code by the build, so it has to be known
# here. A different address means building again. See docs/deploy.md.
ARG NEXT_PUBLIC_API_BASE_URL
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" \
    || (echo "Set the build argument NEXT_PUBLIC_API_BASE_URL to the address the app will be opened at, for example https://pod.example.com" >&2; exit 1)
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build
# next.config.ts needs TypeScript to be read, and the running image has no dev dependencies,
# so hand it a plain JavaScript copy.
RUN npx tsc next.config.ts --module esnext --moduleResolution bundler --target es2022 --skipLibCheck --outDir /config

# ---- install only what the app needs at runtime ----
FROM node:22-bookworm-slim AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- the image that runs ----
FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ARG NEXT_PUBLIC_API_BASE_URL
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    SEED_SAMPLE_DATA=false
WORKDIR /app

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY package.json ./
COPY public ./public
COPY --from=build /config/next.config.js ./next.config.js
COPY --from=build /app/.next ./.next

# db.json and uploads/ live in /data; mount a volume there so they outlive the container.
# Next.js keeps a small cache of its own under .next/cache.
RUN rm -rf .next/cache && mkdir -p /data .next/cache && chown node:node /data .next/cache
VOLUME /data
USER node
EXPOSE 3000

# Healthy means the server answers and can read the database.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/streams/random').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Run Next directly (not through npm) so it receives stop signals and shuts down cleanly.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
