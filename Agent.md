# Agent Guidelines

## 1. Project Context
This repository contains the coursework project for CPE 334 (Introduction to Software Engineering in the Age of AI Agents), Semester 1/2026.
Domain: Theme 9 Queue and Service Management System (Bank Branch Queue System).
Team:
1. Wichitchai Suwanno (67070503439)
2. Wathit Tritsananawakit (67070503495)

The product manages walk in queue tickets for bank branches. It handles queue joining, calling, serving, completing, cancelling, and no shows. It strictly excludes financial transactions, payments, deposits, KYC, and real customer data. All test data must be synthetic.

## 2. Core Technical Constraints
1. Layering: Next.js frontend forwards requests through a same origin Route Handler proxy to the NestJS API. Business rules reside exclusively in the NestJS domain and application layers, never in controllers or React components.
2. Persistence: PostgreSQL via TypeORM with synchronize set to false. All schema modifications must occur via explicit SQL migration files in order.
3. Time and Date: Never invoke new Date() directly in domain or application logic. Inject and use the Clock service for all timestamps and Asia/Bangkok date calculations.
4. Authentication: Server side sessions stored in PostgreSQL with argon2id password hashing and HttpOnly session cookies. Client supplied role and identity claims are never trusted.

## 3. Engineering Process and TDD Rules
1. Contract First: Feature specification, acceptance criteria, and software test specification must be reviewed and merged into the active sprint staging branch before implementation begins.
2. Test Driven Development: Write and run the failing test first for domain business rules. Retain terminal execution outputs for both the failing and passing states.
3. Test Integrity: Never weaken, comment out, or skip tests to achieve green runs.
4. Git Commits: Do not squash commits. Preserve distinct red test and green implementation commits to provide verification evidence.

## 4. Work Scope for Agents
1. Agents must work on a single bounded Issue at a time.
2. Code generation must strictly align with the contract assigned to the issue.
3. Keep controllers thin, validation declarative via class validator, and database operations transactional using a single EntityManager or QueryRunner per transaction.
