/**
 * TEST-06 / AC-06 table: every protected Sprint 1 endpoint.
 * F-01 adds its 2 rows; F-02 (#9) appends 4 and F-03 (#10) appends 5
 * (see docs/sprints/sprint-1/F-01-auth.md section 4.4).
 * `:id` is replaced with a random valid UUID by the test.
 */
export interface ProtectedEndpoint {
  method: 'get' | 'post';
  path: string;
  feature: 'F-01' | 'F-02' | 'F-03';
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
  // F-03 (#10): GET /api/operator/queues, GET /api/operator/current-entry,
  //             POST /api/queues/D/call-next, POST /api/entries/:id/start, POST /api/entries/:id/complete
];
