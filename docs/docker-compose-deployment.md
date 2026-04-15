# Full-Stack Docker Compose Deployment

This repo now includes a single compose file for running the full stack together:

- frontend
- backend
- PostgreSQL
- Redis

## Files

- [docker-compose.deploy.yml](/Users/adititiwari/WebstormProjects/inventiq/docker-compose.deploy.yml)
- [client/Dockerfile](/Users/adititiwari/WebstormProjects/inventiq/client/Dockerfile)
- [client/nginx.conf](/Users/adititiwari/WebstormProjects/inventiq/client/nginx.conf)
- [server/Dockerfile](/Users/adititiwari/WebstormProjects/inventiq/server/Dockerfile)

## What It Does

- serves the frontend on `http://localhost:8080`
- serves the backend API on `http://localhost:5001`
- makes the browser use `/api` from the frontend origin
- proxies `/api` through nginx to the backend container
- starts Postgres and Redis with persistent Docker volumes

## Start The Full Stack

Before starting, provide the backend secrets through environment variables.

Option 1: use an env file:

```bash
cp .env.deploy.example .env.deploy
```

Fill in the real values in `.env.deploy`, then start:

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml up --build
```

Option 2: export the variables from your shell first:

```bash
export JWT_SECRET=your_secret
export APP_USER=your_username
export APP_PASS_HASH=your_bcrypt_hash
export GEMINI_API_KEY=your_gemini_key
```

Then run:

```bash
docker compose -f docker-compose.deploy.yml up --build
```

If `GEMINI_MODEL` is not provided, the compose file defaults it to `gemini-2.5-flash`.

From the repo root:

```bash
docker compose -f docker-compose.deploy.yml up --build
```

Detached mode:

```bash
docker compose -f docker-compose.deploy.yml up --build -d
```

## Stop The Stack

```bash
docker compose -f docker-compose.deploy.yml down
```

## Open The App

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:5001/api/health`

## Environment Inputs

The backend now reads these secrets from the environment at compose startup:

- `JWT_SECRET`
- `APP_USER`
- `APP_PASS_HASH`
- `GEMINI_API_KEY`
- optional: `GEMINI_MODEL`

## Notes

- This compose file is useful for one-command full-stack deployment and demo environments.
- For stricter SRS cloud credibility, the AWS deployment plan remains the primary deployment path.
