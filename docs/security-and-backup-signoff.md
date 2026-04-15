# Security And Backup Signoff

This document is the credibility layer for the SRS items that are mostly infrastructure-driven:

- HTTPS in transit
- encryption at rest
- daily automated backups

Use it as your signoff checklist and as supporting material for presentation or evaluation.

## SRS Mapping

From the SRS:

- Cloud Security: data encrypted in transit (`HTTPS`)
- Cloud Security: data encrypted at rest (`AES-256`)
- Backups: daily automated cloud backups

## 1. HTTPS In Transit

### Required AWS Setup

- `AWS Certificate Manager (ACM)` certificate issued for:
  - frontend domain
  - backend/API domain
- frontend served over HTTPS through `Amplify`
- backend served over HTTPS through `ALB + ACM`
- HTTP redirected to HTTPS

### What To Verify

- visiting the frontend uses `https://`
- API requests also go to `https://`
- browser shows no mixed-content errors
- direct HTTP requests redirect to HTTPS

### Evidence To Capture

- screenshot of frontend URL using HTTPS
- screenshot of backend/API URL using HTTPS
- screenshot of ACM certificate attached to the domain or ALB

### Signoff Statement

“Inventiq encrypts all client-to-cloud traffic in transit using HTTPS with AWS-managed TLS certificates.”

## 2. Encryption At Rest

### Required AWS Setup

- `RDS PostgreSQL` created with storage encryption enabled
- `ElastiCache Redis` encryption enabled if available in the chosen service mode
- any persistent object storage or backups stored with server-side encryption

### What To Verify

- RDS instance shows encryption enabled
- backup storage inherits encrypted storage handling
- Redis configuration matches the selected encrypted deployment mode

### Evidence To Capture

- screenshot of RDS encryption setting
- screenshot of Redis encryption setting if enabled
- short architecture note that AWS-managed encrypted services are used

### Signoff Statement

“Inventiq stores operational data using AWS-managed encrypted services, satisfying encryption-at-rest requirements.”

## 3. Daily Automated Backups

### Required AWS Setup

- enable `RDS automated backups`
- configure daily backup retention
- optionally create manual snapshots before major demos/releases

### What To Verify

- automated backups are enabled on RDS
- backup retention is visible in the RDS configuration
- snapshot/restore options are available

### Evidence To Capture

- screenshot of RDS automated backup settings
- screenshot of retention window

### Signoff Statement

“Inventiq uses daily automated cloud backups through Amazon RDS automated backup scheduling.”

## 4. Minimum Credible Evidence Pack

For a presentation or evaluation, collect these:

1. frontend HTTPS screenshot
2. backend HTTPS screenshot
3. ACM certificate screenshot
4. RDS encryption screenshot
5. RDS automated backup screenshot
6. one short architecture diagram or architecture slide

## 5. What To Say In The Demo / Viva

Recommended short answer:

“Deployment is cloud-hosted on AWS. The frontend is served over HTTPS, the backend sits behind an HTTPS load balancer, the PostgreSQL database is encrypted at rest, and daily automated backups are enabled through AWS-managed database services.”

## 6. Definition Of Done

This section is complete when:

- frontend is HTTPS
- backend is HTTPS
- RDS encryption is enabled
- daily automated RDS backups are enabled
- screenshots or proof are captured
