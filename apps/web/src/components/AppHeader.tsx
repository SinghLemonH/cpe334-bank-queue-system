'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, User } from '@/lib/api';

/**
 * Header for signed-in pages (F-01 contract 5.2): display name, role and Logout.
 * A 401 from /me sends the user to /login.
 */
export function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
      });
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the session is already gone (401), the user ends up on /login.
    }
    router.replace('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <span className="font-semibold text-slate-800">Bank Branch Queue</span>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <span data-testid="current-user">
            <span className="font-medium">{user.displayName}</span>{' '}
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{user.role}</span>
          </span>
        ) : (
          <span className="text-slate-400">Loading...</span>
        )}
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-60"
        >
          {loggingOut ? 'Signing out...' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
