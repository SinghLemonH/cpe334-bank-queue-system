/**
 * TEST-06 / AC-06 table: every protected Sprint 1 endpoint.
 * F-01 adds its 2 rows; F-02 (#9) appends 4 and F-03 (#10) appends 5
 * (see docs/sprints/sprint-1/F-01-auth.md section 4.4).
 * `:id` is replaced with a random valid UUID by the test.
 */
export interface ProtectedEndpoint {
  method: 'get' | 'post' | 'patch';
  path: string;
  /** Sprint 2 widened the union (docs/sprints/sprint-2/sts.md 2.7). */
  feature: 'F-01' | 'F-02' | 'F-03' | 'F-04' | 'F-05' | 'F-06' | 'F-07' | 'F-08';
}

export const PROTECTED_ENDPOINTS: ProtectedEndpoint[] = [
  // F-01 Auth & RBAC
  { method: 'post', path: '/api/auth/logout', feature: 'F-01' },
  { method: 'get', path: '/api/auth/me', feature: 'F-01' },
  // F-02 Join queue & my ticket
  { method: 'get', path: '/api/queues', feature: 'F-02' },
  { method: 'post', path: '/api/queues/D/entries', feature: 'F-02' },
  { method: 'get', path: '/api/me/entries', feature: 'F-02' },
  { method: 'get', path: '/api/entries/:id', feature: 'F-02' },
  // F-03 Operator service desk
  { method: 'get', path: '/api/operator/queues', feature: 'F-03' },
  { method: 'get', path: '/api/operator/current-entry', feature: 'F-03' },
  { method: 'post', path: '/api/queues/D/call-next', feature: 'F-03' },
  { method: 'post', path: '/api/entries/:id/start', feature: 'F-03' },
  { method: 'post', path: '/api/entries/:id/complete', feature: 'F-03' },
  // F-04 Customer cancel (Sprint 2)
  { method: 'post', path: '/api/entries/:id/cancel', feature: 'F-04' },
  // F-05 No-show (Sprint 2)
  { method: 'post', path: '/api/entries/:id/no-show', feature: 'F-05' },
];
