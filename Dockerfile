FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    bash \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /hyperagents

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENTRYPOINT ["pnpm", "tsx"]
CMD ["examples/scoring/run.ts"]
