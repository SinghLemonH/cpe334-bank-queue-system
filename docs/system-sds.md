# System-Level SDS (Software Design Specification)

## 1. Architecture & Stack
* **Architecture:** Modular Monolith with 3 Logical Layers (Presentation -> Application/Domain -> Infrastructure Persistence).
* **Frontend:** Next.js 16 (App Router), React, Tailwind CSS. Route protection via `src/proxy.ts`.
* **Backend:** NestJS 11 (Controllers, Services, Repositories).
* **Database:** PostgreSQL 17 managed via TypeORM 0.3 (`synchronize: false`, Raw SQL Migrations).
* **Authentication:** Stateful DB sessions (`sessions` table) with HttpOnly `sid` cookies and Argon2id password hashing.

## 2. Shared API Conventions & Error Format
All API responses follow consistent HTTP status codes. Errors are returned as:
```json
{
  "error": {
    "code": "DUPLICATE_ACTIVE_ENTRY",
    "message": "Customer already has an active entry in this queue for today."
  }
}