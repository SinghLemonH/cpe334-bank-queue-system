'use client';

import { useState } from 'react';
import { api, ApiError, QueueSummary } from '@/lib/api';
import { FriendlyMessage, messageForDesk } from '@/lib/errors';

export interface QueueControlsResult {
  error?: FriendlyMessage;
  notice?: FriendlyMessage;
}

const smallButton =
  'flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * F-08 open/close and end-of-day for one assigned queue (docs/sprints/sprint-2/README.md 4.6).
 * Calls the API itself and reports the outcome to the page, which then reloads.
 */
export function QueueControls({
  queue,
  disabled,
  onResult,
}: {
  queue: QueueSummary;
  disabled: boolean;
  onResult: (result: QueueControlsResult) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<'toggle' | 'end-day' | null>(null);

  async function run(kind: 'toggle' | 'end-day') {
    if (
      kind === 'end-day' &&
      !window.confirm(`End the day for ${queue.code}? All waiting and called tickets will expire.`)
    ) {
      return;
    }
    setBusy(kind);
    let result: QueueControlsResult = {};
    try {
      if (kind === 'toggle') {
        await api<QueueSummary>(`/queues/${queue.code}`, {
          method: 'PATCH',
          body: JSON.stringify({ isOpen: !queue.isOpen }),
        });
      } else {
        const res = await api<{ queue: QueueSummary; expiredCount: number }>(`/queues/${queue.code}/end-day`, {
          method: 'POST',
        });
        result = {
          notice: {
            en: `${res.expiredCount} tickets expired. Queue ${queue.code} is now closed.`,
            th: `บัตรคิวหมดอายุ ${res.expiredCount} ใบ และปิดคิว ${queue.code} แล้ว`,
          },
        };
      }
    } catch (err) {
      result = { error: messageForDesk(err instanceof ApiError ? err.code : undefined) };
    }
    await onResult(result);
    setBusy(null);
  }

  return (
    <div className="mt-3 flex gap-2" data-testid={`queue-controls-${queue.code}`}>
      <button type="button" className={smallButton} disabled={disabled || busy !== null} onClick={() => run('toggle')}>
        {busy === 'toggle' ? 'Working...' : queue.isOpen ? 'Close queue' : 'Open queue'}
      </button>
      <button type="button" className={smallButton} disabled={disabled || busy !== null} onClick={() => run('end-day')}>
        {busy === 'end-day' ? 'Working...' : 'End of day'}
      </button>
    </div>
  );
}
