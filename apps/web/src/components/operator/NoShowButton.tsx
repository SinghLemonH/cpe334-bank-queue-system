import type { QueueEntry } from '@/lib/api';

/** Display only: the server applies NO_SHOW_GRACE_MINUTES (F-05, default 2) and returns 409 if too early. */
const GRACE_MINUTES = 2;

const secondaryButton =
  'flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function availableFrom(calledAt: string | null): string | null {
  if (!calledAt) return null;
  return new Date(new Date(calledAt).getTime() + GRACE_MINUTES * 60_000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

/** F-05 No-show on the CALLED current-entry card (docs/sprints/sprint-2/README.md 4.3). */
export function NoShowButton({
  entry,
  disabled,
  working,
  onNoShow,
}: {
  entry: QueueEntry;
  disabled: boolean;
  working: boolean;
  onNoShow: () => void;
}) {
  if (entry.status !== 'CALLED') return null;
  const from = availableFrom(entry.calledAt);
  return (
    <div className="mt-3">
      <button type="button" className={secondaryButton} disabled={disabled} onClick={onNoShow}>
        {working ? 'Working...' : 'No-show'}
      </button>
      {from && (
        <p data-testid="no-show-hint" className="mt-1.5 text-center text-xs text-stone-500">
          No-show available from {from} · บันทึกว่าไม่มาได้ตั้งแต่ {from}
        </p>
      )}
    </div>
  );
}
