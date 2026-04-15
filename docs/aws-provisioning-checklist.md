# AWS Provisioning Checklist

This checklist turns the high-level AWS plan into an execution runbook for Inventiq.

Use this in order.

## Prerequisites

- AWS account with billing enabled
- A chosen AWS region
- Access to Route 53 or another DNS provider if you want custom domains
- Final production values ready for:
  - `JWT_SECRET`
  - `APP_USER`
  - `APP_PASS_HASH`
  - `GEMINI_API_KEY`

## Recommended AWS Services

- Frontend: `AWS Amplify Hosting`
- Backend API: `Amazon ECS Fargate`
- Database: `Amazon RDS PostgreSQL`
- Redis: `Amazon ElastiCache for Redis`
- HTTPS: `AWS Certificate Manager + Application Load Balancer`

## Step A: Networking Baseline

1. Create or choose a VPC.
2. Create public and private subnets.
3. Place:
   - `ALB` in public subnets
   - `ECS tasks`, `RDS`, and `ElastiCache` in private subnets
4. Create security groups:
   - `alb-sg`: allow `80` and `443` from the internet
   - `ecs-sg`: allow `5001` only from `alb-sg`
   - `rds-sg`: allow `5432` only from `ecs-sg`
   - `redis-sg`: allow `6379` only from `ecs-sg`

Definition of done:
- the network exists
- the backend can talk privately to Postgres and Redis
- the internet can only reach the ALB

## Step B: Provision RDS PostgreSQL

1. Create an `RDS PostgreSQL` instance.
2. Enable:
   - automated backups
   - storage encryption
   - deletion protection for demo safety if desired
3. Create the `inventiq` database.
4. Record:
   - endpoint
   - port
   - username
   - password
5. Build the production `DATABASE_URL`:
   - `postgresql://username:password@rds-endpoint:5432/inventiq?schema=public`

Definition of done:
- RDS is reachable from ECS security group
- automated backups are enabled
- encryption at rest is enabled

## Step C: Provision ElastiCache Redis

1. Create an `ElastiCache for Redis` cluster or serverless Redis.
2. Place it in private subnets.
3. Attach the `redis-sg` security group.
4. Record the Redis endpoint.
5. Build the production `REDIS_URL`.

Definition of done:
- Redis is reachable from ECS
- external clients cannot connect directly

## Step D: Backend Container Readiness

Before ECS deployment, the repo should have:
- a `server` container build path
- production environment variables
- Prisma migration/db sync plan

This repo now includes:
- [server/Dockerfile](/Users/adititiwari/WebstormProjects/inventiq/server/Dockerfile)
- [server/.dockerignore](/Users/adititiwari/WebstormProjects/inventiq/server/.dockerignore)
- backend production scripts in [server/package.json](/Users/adititiwari/WebstormProjects/inventiq/server/package.json)

Definition of done:
- the backend can be built as a container image

## Step E: Provision ECS Fargate Backend

1. Create an ECS cluster.
2. Create an ECR repository for the backend image.
3. Push the backend container image to ECR.
4. Create an ECS task definition with:
   - container port `5001`
   - environment variables from [server/.env.example](/Users/adititiwari/WebstormProjects/inventiq/server/.env.example)
5. The backend image startup command already runs:
   - `npx prisma migrate deploy`
   - then `node dist/index.js`
   so ECS tasks can apply committed migrations on boot.
6. Use these production env vars:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET`
   - `APP_USER`
   - `APP_PASS_HASH`
   - `PORT=5001`
   - `NODE_ENV=production`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
7. Create an ECS service with Fargate.
8. Attach it to the ALB target group.

Definition of done:
- ECS service is healthy
- `/api/health` works behind the ALB

## Step F: HTTPS For Backend

1. Request an ACM certificate for the API domain.
2. Attach the certificate to the ALB HTTPS listener.
3. Route traffic:
   - `443 -> ALB -> ECS target group`
4. Redirect `80` to `443`.

Definition of done:
- backend is reachable only over HTTPS
- health endpoint works over the final API domain

## Step G: Frontend Deployment With Amplify

1. Connect the repo to Amplify.
2. Use the repo-level Amplify spec:
   - [amplify.yml](/Users/adititiwari/WebstormProjects/inventiq/amplify.yml)
3. Confirm Amplify detects:
   - `appRoot: client`
   - build output: `client/dist`
4. Add environment variable:
   - `VITE_API_BASE_URL=https://api.your-domain.com/api`
5. Deploy the frontend.
6. If using a custom domain, attach it in Amplify.

Definition of done:
- frontend is publicly reachable
- frontend talks to the production backend

## Step H: DNS

Recommended hostnames:
- frontend: `app.your-domain.com`
- backend: `api.your-domain.com`

1. Point frontend domain to Amplify.
2. Point API domain to the ALB.

Definition of done:
- both frontend and backend use stable domains

## Step I: Database Initialization

1. Run Prisma schema sync or migrations against RDS.
2. Seed the production/demo database if needed.

Recommended order:
1. schema push/migration
2. seed data
3. smoke test login

Definition of done:
- database schema matches Prisma
- demo data exists if needed

## Step J: Daily Backup Credibility

The SRS requires daily automated cloud backups.

Minimum credible implementation:
- enable RDS automated backups with daily retention
- document retention window
- optionally schedule manual pre-demo snapshots

Definition of done:
- daily backups are enabled and documented
- supporting proof should be recorded per [security-and-backup-signoff.md](/Users/adititiwari/WebstormProjects/inventiq/docs/security-and-backup-signoff.md)

## Step K: Encryption At Rest Credibility

The SRS requires encryption at rest.

Minimum credible implementation:
- RDS encryption enabled
- ElastiCache encryption enabled if available in the chosen setup
- encrypted storage for backend logs/images/artifacts if used

Definition of done:
- encrypted managed services are used and documented
- supporting proof should be recorded per [security-and-backup-signoff.md](/Users/adititiwari/WebstormProjects/inventiq/docs/security-and-backup-signoff.md)

## Production Env Placement

### Amplify
- `VITE_API_BASE_URL`

### ECS Task Definition / Secrets Store
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `APP_USER`
- `APP_PASS_HASH`
- `PORT`
- `NODE_ENV`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## Post-Deployment Verification

After deployment, verify:

1. frontend loads over HTTPS
2. login works
3. products load
4. sales load
5. purchases load
6. manufacturing loads
7. history loads
8. dashboard loads
9. SSE stream connects successfully
10. chatbot responds using Gemini
11. create/edit/delete flows work
12. exports still work

## Known Step 3 Dependency

The backend still needs production containerization artifacts for ECS.

That will be the next repo implementation step.
