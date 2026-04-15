# AWS Deployment Plan

## Goal
Deploy Inventiq in a way that is credible against the SRS:
- cloud hosted
- HTTPS in transit
- encryption at rest
- daily automated backups
- real-time sync between clients and the cloud backend

## Recommended AWS Architecture

### Frontend
- Service: `AWS Amplify Hosting`
- Why:
  - easiest path for the Vite React client
  - built-in HTTPS
  - easy environment variable management
  - simple CI/CD from the repo

Alternative:
- `S3 + CloudFront` if you want tighter manual control

### Backend API
- Service: `AWS ECS Fargate`
- Why:
  - better long-term fit than a manually managed EC2 server
  - easy environment variable injection
  - works well with Express + Prisma
  - easy to place behind an Application Load Balancer for HTTPS

Alternative:
- `EC2` for the fastest one-instance setup

### Database
- Service: `Amazon RDS PostgreSQL`
- Why:
  - directly matches the current Prisma/Postgres setup
  - supports automated backups
  - supports encryption at rest

### Redis
- Service: `Amazon ElastiCache for Redis`
- Why:
  - matches the current active-session and concurrency-cap logic
  - suitable for the existing SSE/session runtime behavior

### HTTPS
- Services:
  - `AWS Certificate Manager (ACM)`
  - `Application Load Balancer` for the backend
  - Amplify-managed HTTPS for the frontend

### Backups
- Primary:
  - `RDS automated backups`
- Optional:
  - manual snapshots before releases

## Deployment Topology

1. `client` deployed to Amplify
2. `server` container deployed to ECS Fargate
3. backend exposed through an ALB over HTTPS
4. `RDS PostgreSQL` as the system-of-record database
5. `ElastiCache Redis` for active sessions / concurrency control

## Environment Variable Mapping

### Client
- `VITE_API_BASE_URL`
  - production value example:
  - `https://api.your-domain.com/api`

### Server
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `APP_USER`
- `APP_PASS_HASH`
- `PORT`
- `NODE_ENV=production`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## Step 1 Repo Readiness Changes

The repo should support deployment with:
- environment-driven client API base URL
- clean example env files for client and server
- deployment documentation for AWS

This step is now covered by:
- [client/.env.example](/Users/adititiwari/WebstormProjects/inventiq/client/.env.example)
- [server/.env.example](/Users/adititiwari/WebstormProjects/inventiq/server/.env.example)
- [client/src/lib/api.tsx](/Users/adititiwari/WebstormProjects/inventiq/client/src/lib/api.tsx)

## Definition Of Done For Step 1

Step 1 is complete when:
- the frontend no longer assumes localhost in deployed environments
- the repo has AWS deployment documentation
- clean example env files exist for both app sides
- the next step can focus purely on actual AWS provisioning / HTTPS / backups

## Next Execution Order

1. provision `RDS PostgreSQL`
2. provision `ElastiCache Redis`
3. deploy backend to `ECS Fargate`
4. attach `ACM + ALB` for HTTPS
5. deploy frontend to `Amplify`
6. point `VITE_API_BASE_URL` at the production API
7. verify SSE, auth, CRUD, chatbot, and exports in the cloud environment
