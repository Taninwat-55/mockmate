# MockMate

AI-powered interview practice platform for software engineers.

Paste a job description → get custom coding or system design questions → answer them → receive structured, graded feedback.

---

## What This Project Demonstrates

- Full-stack Next.js app deployed on Vercel
- AWS infrastructure provisioned with Terraform (S3, CloudFront, Lambda)
- AI agents with tool-calling (question generation, answer grading, DB lookups)
- Rate limit handling for LLM providers
- Stripe subscription + credit system
- PostgreSQL via Prisma ORM
- Product analytics with PostHog

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & Backend | Next.js (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js |
| Payments | Stripe |
| Analytics | PostHog |
| File Storage | AWS S3 |
| CDN | AWS CloudFront |
| Background Jobs | AWS Lambda |
| Infrastructure | Terraform |
| Deployment | Vercel |

---

## Project Documentation

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
- [`docs/architecture/`](docs/architecture/) — System architecture diagrams and notes
- [`docs/decisions/`](docs/decisions/) — Architecture Decision Records (ADRs)

---

## Local Development

> Setup instructions will be added once the app scaffold is in place.

---

## Status

Currently in planning phase. Follow the journey on [LinkedIn](#).
