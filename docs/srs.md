# Software Requirements Specification (SRS) - Bank Branch Queue System

## 1. Context & Stakeholders
* **System Name:** Bank Branch Queue System (Theme 9: Queue and Service Management System)
* **Target Users:**
  * **Customer:** Walk-in bank customers taking queue numbers for specific services (Deposit/Withdrawal, Loans, Account Opening).
  * **Operator:** Bank tellers and officers calling, serving, and managing queue flows.
* **Exclusions:** Financial transactions, money transfers, deposits/withdrawals processing, KYC, self-registration, SMS/LINE notifications, and advance appointment bookings.

## 2. Functional Requirements (FR) & Business Rules (BR)
* **FR-01:** Users can log in, log out, and retrieve current user identity (Auth & RBAC).
* **FR-02:** Customers can view service queues and join an open queue to get a display number and status.
* **FR-03:** Customers can view their own ticket status and position/people ahead.
* **FR-04:** Operators can call the next eligible entry in an assigned queue.
* **FR-05:** Operators can start and complete service for an entry they called.
* **FR-13:** Operators can view assigned queues and currently held active entry.

* **BR-01:** Display numbers are unique per queue per day (e.g., D001, D002).
* **BR-02:** A customer can have at most 1 active entry (WAITING, CALLED, SERVING) per queue per day.
* **BR-03:** Call-next selects the WAITING entry with the lowest sequence (FIFO).
* **BR-04:** Only valid state transitions are allowed: WAITING -> CALLED -> SERVING -> COMPLETED.
* **BR-05:** Operators can only operate on queues assigned to them.
* **BR-06:** An operator holds at most 1 active entry (CALLED or SERVING) at a time.
* **BR-07:** Only the calling operator can start or complete the entry.
* **BR-08:** No financial data, account numbers, or national IDs are stored.
* **BR-09:** Closed queues reject new joins, but existing entries can still be served.
* **BR-10:** Sequence numbers reset to 001 every midnight (Asia/Bangkok).

## 3. Non-Functional Requirements (NFR)
* **NFR-01:** Unauthenticated requests to protected API endpoints return HTTP 401. (Verified in Sprint 1)
* **NFR-02:** Passwords are stored exclusively using Argon2id hashes. (Verified in Sprint 1)
* **NFR-03:** 20 concurrent join requests yield 20 distinct sequential numbers without gaps/duplicates. (Verified in Sprint 1)
* **NFR-04:** Persistence test: Data survives API/DB application restart. (Verified in Sprint 1)
* **NFR-07:** No secrets committed to Git; configuration strictly via `.env.example`. (Verified in Sprint 1)

## 4. Key Decisions Log
* **D-01:** Sequence formatting uses Queue Code + 3-digit zero-padded number (e.g., `D001`).
* **D-06:** `queue_date` calculated in `Asia/Bangkok` timezone.
* **D-14:** Operator ownership strict validation (`NOT_ENTRY_OWNER` if another operator touches the entry).