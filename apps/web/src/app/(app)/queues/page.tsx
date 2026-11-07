'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, QueueSummary } from '@/lib/api';
import { FriendlyMessage, messageFor, messageForJoin } from '@/lib/errors';
import { AlertCircleIcon, ArrowRightIcon, ClockIcon, SpinnerIcon } from '@/components/icons';

const primaryButton =
  'mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto';

const secondaryButton =
  'rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2';

interface JoinError {
  queueCode: string;
  message: FriendlyMessage;
  code?: string;
}

/** Customer home (F-02 contract 5.1, UI spec section 6). */
export default function QueuesPage() {
  const router = useRouter();
  const [queues, setQueues] = useState<QueueSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<FriendlyMessage | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<JoinError | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await api<QueueSummary[]>('/queues');
      setQueues(rows);
    } catch (err) {
      setLoadError(messageFor(err instanceof ApiError ? err.code : undefined));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onJoin(queue: QueueSummary) {
    setJoining(queue.code);
    setJoinError(null);
    try {
      await api('/queues/' + queue.code + '/entries', { method: 'POST' });
      router.push('/my-ticket');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      setJoinError({ queueCode: queue.code, code, message: messageForJoin(code) });
      setJoining(null);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Service queues</h1>
      <p className="mt-1 text-xs text-stone-500">เลือกบริการแล้วกดรับบัตรคิว</p>

      {loading && <p className="mt-8 text-sm text-stone-500">Loading queues...</p>}

      {!loading && loadError && (
        <div className="mt-8">
          <div
            role="alert"
            data-testid="queues-error"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{loadError.en}</p>
              <p className="text-red-600/80">{loadError.th}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setLoading(true); load(); }} className={`${secondaryButton} mt-4`}>
            Retry
          </button>
        </div>
      )}

      {!loading && queues && queues.length === 0 && (
        <p className="mt-8 text-sm text-stone-600">No service queues are available.</p>
      )}

      {!loading && queues && queues.length > 0 && (
        <ul className="mt-8 space-y-4">
          {queues.map((queue) => {
            const error = joinError?.queueCode === queue.code ? joinError : null;
            const busy = joining === queue.code;
            return (
              <li key={queue.code}>
                <article
                  data-testid={`queue-${queue.code}`}
                  className="rounded-xl border border-stone-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{queue.code}</p>
                      <h2 className="text-lg font-semibold text-stone-900">{queue.name}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        queue.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {queue.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                    <ClockIcon size={18} />
                    <span className="tabular-nums">{queue.waitingCount} waiting</span>
                  </p>
                  <button
                    type="button"
                    className={primaryButton}
                    disabled={!queue.isOpen || joining !== null}
                    onClick={() => onJoin(queue)}
                  >
                    {busy ? (
                      <>
                        <SpinnerIcon size={18} /> Joining...
                      </>
                    ) : (
                      <>
                        Join <ArrowRightIcon size={18} />
                      </>
                    )}
                  </button>
                  {error && (
                    <div
                      role="alert"
                      data-testid={`join-error-${queue.code}`}
                      className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                    >
                      <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{error.message.en}</p>
                        <p className="text-red-600/80">{error.message.th}</p>
                        {error.code === 'DUPLICATE_ACTIVE_ENTRY' && (
                          <Link href="/my-ticket" className="mt-2 inline-block font-medium text-stone-900 underline">
                            View my ticket
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
