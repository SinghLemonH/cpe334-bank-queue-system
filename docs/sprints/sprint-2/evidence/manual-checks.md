# Sprint 2 manual checks (TEST-41, TEST-54)

Procedures from [`../sts.md`](../sts.md) section 2.9. These are **manual** checks, labelled as such in every report; the rules behind them are covered by automated tests (TEST-37, TEST-38, UT-05 for no-show; TEST-50..TEST-53 for open/close and end-of-day).

Run them on the deployed `v0.4.0-sprint2` (plan Issue S2-4). Record the result, date, tester and the deployed commit from `/api/version`, and save the screenshots next to this file. Use the demo accounts and queues in `spec.md` section 5.1: queue **L** for TEST-54, and **never** close or end the day on queue O before the persistence check.

| Field | TEST-41 (AC-41) | TEST-54 (AC-54) |
|---|---|---|
| Deployed URL / commit | | |
| Date and tester | | |
| Result (Passed / Failed) | | |
| Screenshots | | |

## TEST-41 / AC-41: No-show button (F-05)

Start state: no active ticket for the customer used; the operator holds no entry.

1. Customer (customer2) joins queue D. Operator (teller1) presses **Call next**.
2. Screenshot A: the current-entry card shows **Start**, **No-show** and "No-show available from HH:MM".
3. Press **No-show** before that time. Screenshot B: the alert "Please wait until the grace period has passed before marking no-show." (409 `NO_SHOW_TOO_EARLY`).
4. Wait until the shown time and press **No-show** again. Screenshot C: the card shows "You are not serving anyone. Press Call next."
5. Customer's `/my-ticket`: Screenshot D: the card shows **No-show** with its notice.

Pass: A to D as described; afterwards neither the customer nor the operator holds an active entry.

## TEST-54 / AC-54: Open/close and end-of-day UI (F-08)

Start state: queue L open; loanofficer1 holds no entry.

1. loanofficer1 presses **Close queue** on L. Screenshot A: badge **Closed**, button now **Open queue**.
2. A customer opens `/queues`. Screenshot B: L shows **Closed** and the **Join** button is disabled.
3. loanofficer1 presses **Open queue**; a customer (customer4) joins L (1 WAITING).
4. loanofficer1 presses **End of day** and confirms. Screenshot C: "1 tickets expired. Queue L is now closed." and badge **Closed**.
5. Customer's `/my-ticket`: Screenshot D: the card shows **Expired** with its notice.
6. loanofficer1 presses **Open queue** so L is open again at the end.

Pass: A to D as described and L open at the end.
