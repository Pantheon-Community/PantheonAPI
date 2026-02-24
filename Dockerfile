# syntax=docker/dockerfile:1
# https://docs.docker.com/reference/dockerfile/

# Install Bun
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install Dependencies (temp directory for caching)
FROM base AS install
RUN mkdir -p /temp
COPY package.json bun.lock /temp/
RUN cd /temp && bun install --frozen-lockfile --production

# Finalise Image
FROM base AS release
COPY --from=install /temp/node_modules node_modules
COPY . .

# Run app
USER bun
ENTRYPOINT [ "bun", "." ]

