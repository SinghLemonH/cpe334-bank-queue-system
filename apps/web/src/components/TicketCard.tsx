import type { EntryStatus, QueueEntry } from '@/lib/api';
import { CalendarIcon, ClockIcon } from '@/components/icons';

/**
 * Movie-ticket card for /my-ticket (docs/sprints/sprint-2/README.md 4.7, ui-spec 4.8):
 * zigzag top and bottom edges (.ticket-edge), number, status, a dotted perforation with
 * side notches, a notice per status, and the queue date.
 * Keeps data-testid="ticket" and the texts the Sprint 1 E2E asserts.
 */
interface StatusCopy {
  label: string;
  th: string;
  badge: string;
  notice: string;
  noticeTh: string;
}

/** Display text only; the server decides when no-show is allowed (F-05, default grace 2 minutes). */
const GRACE_MINUTES = 2;

const COPY: Record<EntryStatus, StatusCopy> = {
  WAITING: {
    label: 'Waiting',
    th: 'รอเรียก',
    badge: 'bg-stone-100 text-stone-700',
    notice: 'Please stay in the branch. Your number will be called at a counter.',
    noticeTh: 'กรุณารออยู่ในสาขา เราจะเรียกหมายเลขของคุณที่เคาน์เตอร์',
  },
  CALLED: {
    label: 'Called',
    th: 'ถึงคิวแล้ว',
    badge: 'bg-amber-100 text-amber-800',
    notice: `Please go to the counter now. Tickets not answered within ${GRACE_MINUTES} minutes may be marked no-show.`,
    noticeTh: `กรุณาไปที่เคาน์เตอร์ทันที หากไม่มาภายใน ${GRACE_MINUTES} นาที ระบบอาจบันทึกว่าไม่มา`,
  },
  SERVING: {
    label: 'Being served',
    th: 'กำลังให้บริการ',
    badge: 'bg-sky-100 text-sky-800',
    notice: 'You are being served.',
    noticeTh: 'กำลังให้บริการคุณ',
  },
  COMPLETED: {
    label: 'Completed',
    th: 'เสร็จสิ้น',
    badge: 'bg-emerald-100 text-emerald-800',
    notice: 'Thank you for visiting.',
    noticeTh: 'ขอบคุณที่ใช้บริการ',
  },
  CANCELLED: {
    label: 'Cancelled',
    th: 'ยกเลิกแล้ว',
    badge: 'bg-stone-100 text-stone-500 line-through',
    notice: 'This ticket was cancelled. You can take a new number.',
    noticeTh: 'บัตรคิวนี้ถูกยกเลิกแล้ว คุณสามารถรับบัตรคิวใหม่ได้',
  },
  NO_SHOW: {
    label: 'No-show',
    th: 'ไม่มาตามเรียก',
    badge: 'bg-red-100 text-red-700',
    notice: 'You were called but did not come. Take a new number if you still need service.',
    noticeTh: 'คุณไม่ได้มาตามที่เรียก หากยังต้องการรับบริการกรุณารับบัตรคิวใหม่',
  },
  EXPIRED: {
    label: 'Expired',
    th: 'หมดอายุ',
    badge: 'bg-stone-100 text-stone-500',
    notice: 'This ticket expired at the end of the day.',
    noticeTh: 'บัตรคิวนี้หมดอายุเมื่อสิ้นวัน',
  },
};

function queueDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

function StatusLine({ entry }: { entry: QueueEntry }) {
  if (entry.status === 'WAITING' && entry.peopleAhead !== null) {
    return (
      <p className="mt-3 flex items-center justify-center gap-2 text-sm text-stone-600">
        <ClockIcon size={16} />
        <span className="tabular-nums">People ahead: {entry.peopleAhead}</span>
      </p>
    );
  }
  if (entry.status === 'CALLED') {
    return (
      <p data-testid="ticket-counter" className="mt-3 text-base font-semibold text-stone-900">
        Go to {entry.counterLabel ?? 'the service desk'}
      </p>
    );
  }
  return null;
}

export function TicketCard({ entry, queueName }: { entry: QueueEntry; queueName: string }) {
  const copy = COPY[entry.status] ?? COPY.WAITING;
  return (
    <article
      data-testid="ticket"
      data-status={entry.status}
      className="ticket-edge relative mx-auto w-full max-w-sm bg-white text-center"
    >
      <div className="px-6 pb-5 pt-6">
        <p className="text-sm text-stone-600">Your ticket number is</p>
        <p className="text-xs text-stone-400">หมายเลขคิวของคุณ</p>
        <p className="mt-2 text-6xl font-bold leading-none tracking-tight text-stone-900 tabular-nums">
          {entry.displayNumber}
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${copy.badge}`}>{copy.label}</span>
            {entry.lane === 'PRIORITY' && (
              <span
                data-testid="priority-badge"
                className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800"
              >
                Priority
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-stone-500">{copy.th}</p>
        </div>
        <StatusLine entry={entry} />
        <p className="mt-2 text-xs text-stone-400">
          {queueName} · {entry.queueCode}
        </p>
      </div>

      {/* Perforation: dotted line with a half-circle notch on each side (page background color). */}
      <div className="relative mx-4 border-t-2 border-dotted border-stone-300" aria-hidden="true">
        <span className="absolute -left-[27px] -top-[12px] h-[22px] w-[22px] rounded-full bg-[#f2f1ec]" />
        <span className="absolute -right-[27px] -top-[12px] h-[22px] w-[22px] rounded-full bg-[#f2f1ec]" />
      </div>

      <div className="px-6 pb-3 pt-5">
        <p className="font-semibold text-amber-600">Notice</p>
        <p className="mt-1 text-sm text-amber-600">{copy.notice}</p>
        <p className="mt-0.5 text-xs text-amber-600/80">{copy.noticeTh}</p>
      </div>

      <p className="flex items-center justify-center gap-1.5 px-6 pb-5 pt-2 text-sm text-stone-500">
        <CalendarIcon size={16} />
        <span className="tabular-nums">{queueDate(entry.joinedAt)}</span>
      </p>
    </article>
  );
}
