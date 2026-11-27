# Sprint 3 Manual Checks

## TEST-60 — Priority badge visible on `/my-ticket`, `/operator`, `/board` (AC-60, F-09)

- **Status:** Pending manual verification on deployed release / local dev
- **Seeded accounts used:**
  - `customer1` (DOB `1948-03-15` → `PRIORITY`)
  - `customer2` (DOB `1995-07-02` → `REGULAR`)
  - `teller1` (assigned to queue `D`)

### Steps
1. Sign in as `customer1` and join queue `D` (Deposit & Withdrawal).
2. On `/my-ticket`, confirm the violet `Priority` badge (`bg-violet-100 text-violet-800`) is shown next to the status badge.
3. Open `/operator` as `teller1` and click **Call next** on queue `D` (selecting `Counter 1`).
4. On `/operator`, confirm the `Current customer` card shows `customer1`'s ticket number with the violet `Priority` badge.
5. Open `/board` in an incognito/anonymous window and confirm the called ticket shows the violet `Priority` badge next to the display number (with no customer PII).
6. Complete `customer1`'s ticket, then repeat with `customer2` (`REGULAR`) and confirm **no** `Priority` badge appears on `/my-ticket`, `/operator`, or `/board`.

### Result
- Date / Tester: _TBD_
- Outcome: _TBD_
