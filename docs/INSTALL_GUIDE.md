# Install Guide

## Discord Application

You'll need to create a Discord application via the [Discord developer portal](https://discord.com/developers/), copy the client ID and secret for later.

For OAuth purposes, it needs to have the `identify` and `connections` scopes.

## Setup

This assumes you have [git](https://git-scm.com/) and [Bun](https://bun.com/get) installed already.

```sh
git clone --recursive https://github.com/Pantheon-Community/PantheonAPI.git
cd PantheonAPI
bun install
cp .env.example .env
```

Now fill out the `.env` file with the correct values.

If you are using [Docker](https://www.docker.com/products/docker-desktop/) for hosting the PostgreSQL database (recommended), you can now start it up using the following command:

```sh
docker compose up --build --detach db
```

The app should be ready to start now, which can be done using:

```sh
bun run start
```

