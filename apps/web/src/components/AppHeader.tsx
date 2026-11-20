'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, User } from '@/lib/api';
import { TicketIcon } from '@/components/icons';

/**
 * Signed-in header (UI spec 4.7): brand mark, display name, role badge, Logout.
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
    // Issue #40: the bar must fit a 375px phone even when a desktop scrollbar leaves about 360px.
    // Below `sm` the product name is hidden (the link keeps it as its accessible name), padding
    // shrinks, and the display name truncates instead of pushing Logout off screen.
    <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:gap-4 sm:px-6">
      <div className="flex shrink-0 items-center gap-4">
        <Link
          href={user?.role === 'OPERATOR' ? '/operator' : '/queues'}
          aria-label="Bank Branch Queue"
          className="flex items-center gap-2 text-stone-900"
        >
          <TicketIcon size={22} className="shrink-0" />
          <span className="hidden text-lg font-bold tracking-tight sm:inline">Bank Branch Queue</span>
        </Link>
        {user?.role === 'CUSTOMER' && (
          <nav className="hidden items-center gap-3 text-sm text-stone-600 sm:flex">
            <Link href="/queues" className="hover:text-stone-900">
              Queues
            </Link>
            <Link href="/my-ticket" className="hover:text-stone-900">
              My ticket
            </Link>
          </nav>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-3 text-sm sm:gap-4">
        {user ? (
          <span data-testid="current-user" className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-stone-900" title={user.displayName}>
              {user.displayName}
            </span>
            <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              {user.role}
            </span>
          </span>
        ) : (
          <span className="text-stone-500">Loading...</span>
        )}
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loggingOut ? 'Signing out...' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
