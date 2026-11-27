/**
 * POST /api/queues/:code/entries body (F-09 contract 8.1, BR-15).
 * Intentionally empty: with global ValidationPipe (whitelist + forbidNonWhitelisted),
 * any client-supplied field such as `{ lane: "PRIORITY" }` is rejected with 400.
 */
export class JoinQueueDto {}
