'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, NETWORK_ERROR } from '@/lib/api';
import { FriendlyMessage, messageFor } from '@/lib/errors';

export interface BoardNowServing {
  displayNumber: string;
  counterLabel: string | null;
  status: 'CALLED' | 'SERVING';
  lane: 'REGULAR' | 'PRIORITY';
}

export interface BoardQueue {
  code: string;
  name: string;
  isOpen: boolean;
  waitingCount: number;
  nowServing: BoardNowServing[];
}

export interface BoardResponse {
  generatedAt: string;
  queues: BoardQueue[];
}

const POLL_INTERVAL_MS = 5000;

export default function BoardPage() {
  const [data, setData] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [initialError, setInitialError] = useState<FriendlyMessage | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/public/board', {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => undefined)) as
          | { error?: { code?: string; message?: string } }
          | undefined;
        throw new ApiError(res.status, body?.error?.code ?? 'INTERNAL_ERROR', body?.error?.message ?? res.statusText);
      }
      const json: BoardResponse = await res.json();
      setData(json);
      setIsReconnecting(false);
      setInitialError(null);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : NETWORK_ERROR;
      setData((prev) => {
        if (prev) {
          setIsReconnecting(true);
          return prev;
        }
        setInitialError(messageFor(code));
        return null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    const timer = setInterval(fetchBoard, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchBoard]);

  if (loading && !data) {
    return (
      <main
        data-testid="board-loading"
        className="flex min-h-screen items-center justify-center bg-[#f2f1ec] p-6 text-stone-800"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
          <p className="text-sm font-medium text-stone-700">Loading service board…</p>
          <p className="text-xs text-stone-500">กำลังโหลดจอแสดงคิวบริการ…</p>
        </div>
      </main>
    );
  }

  if (initialError && !data) {
    return (
      <main
        data-testid="board-error"
        className="flex min-h-screen flex-col items-center justify-center bg-[#f2f1ec] p-6 text-stone-800"
      >
        <div role="alert" className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-red-700">{initialError.en}</p>
          <p className="mt-1 text-sm text-red-600/80">{initialError.th}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setInitialError(null);
              fetchBoard();
            }}
            className="mt-4 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Retry / ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  return (
    <main data-testid="board" className="min-h-screen bg-[#f2f1ec] p-4 sm:p-8 text-stone-900">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
            Now Serving
            <span className="ml-3 text-lg sm:text-xl font-normal text-stone-600">กำลังให้บริการ</span>
          </h1>
          <p className="mt-0.5 text-xs text-stone-500">
            Live Queue &amp; Counter Display · จอแสดงหมายเลขคิวและช่องบริการ
          </p>
        </div>

        <div className="flex items-center gap-4">
          {isReconnecting && (
            <div
              role="status"
              data-testid="reconnecting-notice"
              className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Reconnecting… · กำลังเชื่อมต่อใหม่…
            </div>
          )}
          {data?.generatedAt && (
            <span className="text-xs text-stone-500 tabular-nums">
              Updated:{' '}
              {new Date(data.generatedAt).toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Bangkok',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>
      </header>

      {!data || data.queues.length === 0 ? (
        <div
          data-testid="board-empty"
          className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-stone-500"
        >
          <p className="text-base font-medium text-stone-700">No service queues available.</p>
          <p className="mt-1 text-sm text-stone-500">ยังไม่มีรายการคิวเปิดให้บริการ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.queues.map((q) => (
            <section
              key={q.code}
              data-testid={`board-queue-${q.code}`}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-xs font-bold text-white">
                      {q.code}
                    </span>
                    <h2 className="text-lg font-bold text-stone-900">{q.name}</h2>
                  </div>
                  <p className="mt-1 text-xs text-stone-500 tabular-nums">
                    Waiting · รอรับบริการ:{' '}
                    <span className="font-semibold text-stone-700">{q.waitingCount}</span>
                  </p>
                </div>

                {!q.isOpen && (
                  <span
                    data-testid={`closed-badge-${q.code}`}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600"
                  >
                    Closed · ปิด
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-1 flex-col gap-3">
                {q.nowServing.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-sm text-stone-400">
                    <span>No tickets being called</span>
                    <span className="text-xs">ไม่มีคิวที่กำลังเรียก</span>
                  </div>
                ) : (
                  q.nowServing.map((item) => (
                    <article
                      key={item.displayNumber}
                      data-testid={`board-item-${item.displayNumber}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50 p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-stone-900">
                            {item.displayNumber}
                          </span>
                          {item.lane === 'PRIORITY' && (
                            <span
                              data-testid="priority-badge"
                              className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800"
                            >
                              Priority
                            </span>
                          )}
                        </div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.status === 'CALLED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {item.status === 'CALLED'
                            ? 'Called · เชิญที่เคาน์เตอร์'
                            : 'Serving · กำลังให้บริการ'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                          Counter · ช่องบริการ
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-stone-900">
                          <span aria-hidden="true" className="mr-1.5 text-stone-400">
                            →
                          </span>
                          {item.counterLabel || 'Service desk'}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
