/**
 * The single API client (system SDS 4.2). Calls same-origin /api/* through the
 * Route Handler proxy, sends the session cookie, and turns the error shape
 * { error: { code, message } } into a typed ApiError.
 */
export type Role = 'CUSTOMER' | 'OPERATOR';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface QueueSummary {
  code: string;
  name: string;
  isOpen: boolean;
  waitingCount: number;
}

export type EntryStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'EXPIRED';

/** Entry shape (Sprint 1 README 3.4; Sprint 2 README 3.3 adds counterLabel). */
export interface QueueEntry {
  id: string;
  queueCode: string;
  displayNumber: string;
  status: EntryStatus;
  lane: 'REGULAR' | 'PRIORITY';
  peopleAhead: number | null;
  /** Sprint 2 (F-07, D-30). Optional until the counters API lands; null when called without a counter. */
  counterLabel?: string | null;
  joinedAt: string;
  calledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  } catch {
    throw new ApiError(0, NETWORK_ERROR, 'Network error');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new ApiError(res.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? res.statusText);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Landing page per role after login (AC-08). */
export function homeFor(role: Role): string {
  return role === 'OPERATOR' ? '/operator' : '/queues';
}
