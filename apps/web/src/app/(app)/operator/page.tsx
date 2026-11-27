'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, EntryStatus, QueueEntry, QueueSummary } from '@/lib/api';
import { FriendlyMessage, messageFor, messageForDesk } from '@/lib/errors';
import { AlertCircleIcon, ArrowRightIcon, ClockIcon, SpinnerIcon, TicketIcon } from '@/components/icons';
import { CounterSelect } from '@/components/operator/CounterSelect';
import { NoShowButton } from '@/components/operator/NoShowButton';
import { QueueControls, QueueControlsResult } from '@/components/operator/QueueControls';

const POLL_MS = 5000;

const STATUS_LABEL: Partial<Record<EntryStatus, { en: string; th: string; badge: string }>> = {
  CALLED: { en: 'Called', th: 'ถึงคิวแล้ว', badge: 'bg-amber-100 text-amber-800' },
  SERVING: { en: 'Being served', th: 'กำลังให้บริการ', badge: 'bg-sky-100 text-sky-800' },
};

const primaryButton =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButton =
  'rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2';

function timeOf(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

function ErrorAlert({ message, testId }: { message: FriendlyMessage; testId: string }) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
    >
      <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">{message.en}</p>
        <p className="text-red-600/80">{message.th}</p>
      </div>
    </div>
  );
}

/**
 * Operator service desk (F-03 contract 5, UI spec section 6).
 * Every load reads current-entry, so a refresh never loses the held ticket (D-21).
 */
export default function OperatorPage() {
  const [queues, setQueues] = useState<QueueSummary[] | null>(null);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<FriendlyMessage | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [actionError, setActionError] = useState<FriendlyMessage | null>(null);
  const [notice, setNotice] = useState<FriendlyMessage | null>(null);
  const [counters, setCounters] = useState<Record<string, string>>({});

  const load = useCallback(async (initial: boolean) => {
    try {
      const [assigned, current] = await Promise.all([
        api<QueueSummary[]>('/operator/queues'),
        api<{ entry: QueueEntry | null }>('/operator/current-entry'),
      ]);
      setQueues(assigned);
      setEntry(current.entry);
      setLoadError(null);
    } catch (err) {
      if (initial) setLoadError(messageFor(err instanceof ApiError ? err.code : undefined));
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (!timer) timer = setInterval(() => load(false), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    load(true);
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  /** Runs one action, shows its error (if any) and always reloads queues + current entry. */
  async function act(key: string, path: string, body?: unknown) {
    setWorking(key);
    setActionError(null);
    setNotice(null);
    try {
      await api<QueueEntry>(path, {
        method: 'POST',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      setActionError(messageForDesk(err instanceof ApiError ? err.code : undefined));
    }
    await load(false);
    setWorking(null);
  }

  /** F-08 controls report here; the page shows the message and reloads. */
  async function onQueueControls(result: QueueControlsResult) {
    setActionError(result.error ?? null);
    setNotice(result.notice ?? null);
    await load(false);
  }

  const label = entry ? STATUS_LABEL[entry.status] : undefined;
  const queueName = entry ? (queues?.find((q) => q.code === entry.queueCode)?.name ?? entry.queueCode) : '';

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Service desk</h1>
      <p className="mt-1 text-xs text-stone-500">เรียกคิว เริ่มให้บริการ และปิดงาน อัปเดตทุก 5 วินาที</p>

      {loading && <p className="mt-8 text-sm text-stone-500">Loading...</p>}

      {!loading && loadError && (
        <div className="mt-8">
          <ErrorAlert message={loadError} testId="desk-load-error" />
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load(true);
            }}
            className={`${secondaryButton} mt-4`}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && queues && (
        <>
          {actionError && (
            <div className="mt-6">
              <ErrorAlert message={actionError} testId="desk-error" />
            </div>
          )}
          {notice && (
            <div
              role="status"
              data-testid="desk-notice"
              className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700"
            >
              <p className="font-medium">{notice.en}</p>
              <p className="text-emerald-600/80">{notice.th}</p>
            </div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Left: assigned queues */}
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400">Assigned queues</h2>
              {queues.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">No queues are assigned to you.</p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {queues.map((queue) => (
                    <li key={queue.code}>
                      <article
                        data-testid={`desk-queue-${queue.code}`}
                        className="rounded-xl border border-stone-200 bg-white p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{queue.code}</p>
                            <h3 className="text-lg font-semibold text-stone-900">{queue.name}</h3>
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
                        <div className="mt-4">
                          <CounterSelect
                            queueCode={queue.code}
                            value={counters[queue.code]}
                            disabled={entry !== null || working !== null}
                            onChange={(counterId) => setCounters((prev) => ({ ...prev, [queue.code]: counterId }))}
                          />
                        </div>
                        <button
                          type="button"
                          className={`${primaryButton} mt-3`}
                          disabled={entry !== null || working !== null}
                          onClick={() =>
                            act(
                              `call-${queue.code}`,
                              `/queues/${queue.code}/call-next`,
                              counters[queue.code] ? { counterId: counters[queue.code] } : undefined,
                            )
                          }
                        >
                          {working === `call-${queue.code}` ? (
                            <>
                              <SpinnerIcon size={18} /> Working...
                            </>
                          ) : (
                            <>
                              Call next <ArrowRightIcon size={18} />
                            </>
                          )}
                        </button>
                        <QueueControls queue={queue} disabled={working !== null} onResult={onQueueControls} />
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Right: current entry */}
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400">Current customer</h2>
              <article data-testid="current-entry" className="mt-3 rounded-xl border border-stone-200 bg-white p-6">
                {entry ? (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
                      {queueName} · {entry.queueCode}
                    </p>
                    <p className="mt-3 text-5xl font-bold leading-[1.1] tracking-tight text-stone-900 tabular-nums">
                      {entry.displayNumber}
                    </p>
                    {entry.counterLabel && (
                      <p data-testid="current-entry-counter" className="mt-2 text-sm font-medium text-stone-700">
                        {entry.counterLabel}
                      </p>
                    )}
                    {label && (
                      <div className="mt-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${label.badge}`}>
                          {label.en}
                        </span>
                        <p className="mt-1 text-xs text-stone-500">{label.th}</p>
                      </div>
                    )}
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-stone-400">Called at</dt>
                        <dd className="tabular-nums text-stone-700">{timeOf(entry.calledAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-stone-400">Started at</dt>
                        <dd className="tabular-nums text-stone-700">{timeOf(entry.startedAt)}</dd>
                      </div>
                    </dl>
                    {entry.status === 'CALLED' && (
                      <button
                        type="button"
                        className={`${primaryButton} mt-6`}
                        disabled={working !== null}
                        onClick={() => act('start', `/entries/${entry.id}/start`)}
                      >
                        {working === 'start' ? (
                          <>
                            <SpinnerIcon size={18} /> Working...
                          </>
                        ) : (
                          'Start'
                        )}
                      </button>
                    )}
                    <NoShowButton
                      entry={entry}
                      disabled={working !== null}
                      working={working === 'no-show'}
                      onNoShow={() => act('no-show', `/entries/${entry.id}/no-show`)}
                    />
                    {entry.status === 'SERVING' && (
                      <button
                        type="button"
                        className={`${primaryButton} mt-6`}
                        disabled={working !== null}
                        onClick={() => act('complete', `/entries/${entry.id}/complete`)}
                      >
                        {working === 'complete' ? (
                          <>
                            <SpinnerIcon size={18} /> Working...
                          </>
                        ) : (
                          'Complete'
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white">
                      <TicketIcon size={22} />
                    </div>
                    <p className="mt-4 text-sm font-medium text-stone-900">You are not serving anyone. Press Call next.</p>
                    <p className="mt-1 text-xs text-stone-500">ยังไม่มีลูกค้าที่กำลังให้บริการ กด Call next เพื่อเรียกคิว</p>
                  </div>
                )}
              </article>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
