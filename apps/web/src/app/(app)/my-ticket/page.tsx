'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, QueueEntry, QueueSummary } from '@/lib/api';
import { FriendlyMessage, messageFor, messageForCancel } from '@/lib/errors';
import { AlertCircleIcon, TicketIcon } from '@/components/icons';
import { TicketCard } from '@/components/TicketCard';

const POLL_MS = 5000;

const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2';

/**
 * Today's tickets (F-02 contract 5.2) as movie-ticket cards (Sprint 2 README 4.7) with
 * Cancel ticket for WAITING/CALLED (F-04). Polls every 5s and pauses while the tab is hidden.
 */
export default function MyTicketPage() {
  const [entries, setEntries] = useState<QueueEntry[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<FriendlyMessage | null>(null);
  const [stale, setStale] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ id: string; message: FriendlyMessage } | null>(null);

  const load = useCallback(async (initial: boolean) => {
    try {
      const [mine, queues] = await Promise.all([
        api<QueueEntry[]>('/me/entries'),
        api<QueueSummary[]>('/queues').catch(() => [] as QueueSummary[]),
      ]);
      setEntries(mine);
      setNames(Object.fromEntries(queues.map((q) => [q.code, q.name])));
      setLoadError(null);
      setStale(false);
    } catch (err) {
      if (initial) setLoadError(messageFor(err instanceof ApiError ? err.code : undefined));
      else setStale(true);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const refresh = (initial: boolean) => {
      if (cancelled) return;
      load(initial);
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(() => refresh(false), POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    refresh(true);
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  /** F-04: confirm, cancel, then reload. A 409 means the ticket changed meanwhile. */
  async function cancelTicket(entry: QueueEntry) {
    if (!window.confirm(`Cancel ticket ${entry.displayNumber}?`)) return;
    setCancelling(entry.id);
    setCancelError(null);
    try {
      await api<QueueEntry>(`/entries/${entry.id}/cancel`, { method: 'POST' });
    } catch (err) {
      setCancelError({ id: entry.id, message: messageForCancel(err instanceof ApiError ? err.code : undefined) });
    }
    await load(false);
    setCancelling(null);
  }

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">My ticket</h1>
      <p className="mt-1 text-xs text-stone-500">บัตรคิวของวันนี้ อัปเดตทุก 5 วินาที</p>

      {loading && <p className="mt-8 text-sm text-stone-500">Loading...</p>}

      {!loading && loadError && entries === null && (
        <div className="mt-8">
          <div
            role="alert"
            data-testid="ticket-error"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{loadError.en}</p>
              <p className="text-red-600/80">{loadError.th}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setLoading(true); load(true); }} className={`${secondaryButton} mt-4`}>
            Retry
          </button>
        </div>
      )}

      {!loading && stale && (
        <p data-testid="refresh-error" className="mt-4 text-xs text-stone-500">
          Could not refresh
        </p>
      )}

      {!loading && entries && entries.length === 0 && (
        <div className="mt-8 rounded-xl border border-stone-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white">
            <TicketIcon size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-stone-900">You have no ticket today.</h2>
          <p className="mt-1 text-sm text-stone-500">Take a number and we will call you at the counter.</p>
          <Link href="/queues" className={`${secondaryButton} mt-6`}>
            Take a number
          </Link>
        </div>
      )}

      {!loading && entries && entries.length > 0 && (
        <ul className="mt-8 space-y-8">
          {entries.map((entry) => {
            const queueName = names[entry.queueCode] ?? entry.queueCode;
            const cancellable = entry.status === 'WAITING' || entry.status === 'CALLED';
            return (
              <li key={entry.id}>
                <TicketCard entry={entry} queueName={queueName} />
                <div className="mx-auto mt-4 flex w-full max-w-sm flex-col items-center gap-3">
                  {cancelError?.id === entry.id && (
                    <div
                      role="alert"
                      data-testid="cancel-error"
                      className="flex w-full gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                    >
                      <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{cancelError.message.en}</p>
                        <p className="text-red-600/80">{cancelError.message.th}</p>
                      </div>
                    </div>
                  )}
                  {cancellable ? (
                    <button
                      type="button"
                      onClick={() => cancelTicket(entry)}
                      disabled={cancelling !== null}
                      className={`${secondaryButton} w-full disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {cancelling === entry.id ? 'Cancelling...' : 'Cancel ticket'}
                    </button>
                  ) : (
                    <Link href="/queues" className={`${secondaryButton} w-full`}>
                      Take a new number
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
