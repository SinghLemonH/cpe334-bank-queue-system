# Bank Branch Queue System

Coursework project for CPE 334 Introduction to Software Engineering in the Age of AI Agents, Semester 1/2026.

Theme 9: Queue and Service Management System.

## Team Members
1. Wichitchai Suwanno (Student ID: 67070503439)
2. Wathit Tritsananawakit (Student ID: 67070503495)

## Overview
The system manages physical branch queues for walk in banking customers across different service categories. It covers customer ticket issuance, counter calling, service progression, cancellations, and no show handling. Financial records, customer balances, and account processing are outside the system boundary.

## Technology Stack
1. Frontend: Next.js App Router, React, Tailwind CSS
2. Backend: NestJS modular monolith
3. Database: PostgreSQL with TypeORM migrations
4. Authentication: Server side sessions with argon2id and HttpOnly cookie
5. Testing: Jest, Supertest, Playwright

## Prerequisites
1. Node.js version 22 or 24 LTS
2. Docker Desktop and Docker Compose
3. Git

## Development Setup
1. Copy environment configuration:
```bash
cp .env.example .env
```
2. Start PostgreSQL container:
```bash
docker compose up -d
```
3. Install dependencies:
```bash
npm install
```
4. Run migrations and seed data:
```bash
npm run db:migrate
npm run db:seed
```
5. Run the test suite:
```bash
npm test
```
