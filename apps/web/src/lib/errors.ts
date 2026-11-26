/**
 * One place that maps API error codes to friendly messages (system SDS 4.2).
 * F-01 codes are filled in; F-02 (#9) and F-03 (#10) add theirs from their contracts.
 */
export interface FriendlyMessage {
  en: string;
  th: string;
}

const MESSAGES: Record<string, FriendlyMessage> = {
  // F-01 Auth (docs/sprints/sprint-1/F-01-auth.md 5.1)
  INVALID_CREDENTIALS: {
    en: 'Invalid username or password.',
    th: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  },
  VALIDATION_FAILED: {
    en: 'Please enter both username and password.',
    th: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
  },
  UNAUTHENTICATED: {
    en: 'Your session has ended. Please sign in again.',
    th: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  },
  FORBIDDEN: {
    en: 'You are not allowed to do this.',
    th: 'คุณไม่มีสิทธิ์ทำรายการนี้',
  },
  // F-02 Join queue (docs/sprints/sprint-1/F-02-join-queue.md 5.1)
  DUPLICATE_ACTIVE_ENTRY: {
    // BR-02 v2 (Lab 7 CR-01): one active ticket per day across all queues.
    en: 'You already have an active ticket today. Finish it before joining another queue.',
    th: 'คุณมีบัตรคิวที่ยังใช้งานอยู่แล้ววันนี้ กรุณารอให้เสร็จก่อนรับบัตรคิวใหม่',
  },
  QUEUE_CLOSED: {
    en: 'This queue is closed. Please choose another service.',
    th: 'คิวนี้ปิดให้บริการแล้ว กรุณาเลือกบริการอื่น',
  },
  NOT_FOUND: {
    en: 'This queue no longer exists.',
    th: 'ไม่พบคิวนี้',
  },
  // F-03 Service desk (docs/sprints/sprint-1/F-03-service-desk.md 5)
  NO_WAITING_ENTRY: {
    en: 'No customers are waiting in this queue.',
    th: 'ไม่มีลูกค้ารอในคิวนี้',
  },
  OPERATOR_BUSY: {
    en: 'Finish your current customer before calling the next one.',
    th: 'กรุณาให้บริการลูกค้าคนปัจจุบันให้เสร็จก่อนเรียกคิวถัดไป',
  },
  INVALID_TRANSITION: {
    en: 'This ticket has already changed. The page has been refreshed.',
    th: 'สถานะบัตรคิวเปลี่ยนไปแล้ว ระบบได้รีเฟรชหน้าให้',
  },
  NOT_ENTRY_OWNER: {
    en: 'Only the operator who called this ticket can serve it.',
    th: 'เฉพาะพนักงานที่เรียกคิวนี้เท่านั้นที่ให้บริการได้',
  },
};

/** Service desk copy for FORBIDDEN (F-03 contract 5): the operator is not assigned to the queue. */
export const DESK_FORBIDDEN: FriendlyMessage = {
  en: 'You are not assigned to this queue.',
  th: 'คุณไม่ได้รับมอบหมายให้ดูแลคิวนี้',
};

/** Join screen copy for a role rejection (the shared FORBIDDEN line stays generic). */
export const JOIN_FORBIDDEN: FriendlyMessage = {
  en: 'Only customers can join a queue.',
  th: 'เฉพาะลูกค้าเท่านั้นที่สามารถรับบัตรคิวได้',
};

const FALLBACK: FriendlyMessage = {
  en: 'Something went wrong. Please try again.',
  th: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
};

export function messageFor(code: string | undefined): FriendlyMessage {
  return (code && MESSAGES[code]) || FALLBACK;
}

/** Same map as messageFor, with the join-specific FORBIDDEN sentence from the F-02 contract. */
export function messageForJoin(code: string | undefined): FriendlyMessage {
  if (code === 'FORBIDDEN') return JOIN_FORBIDDEN;
  return messageFor(code);
}

/** Same map as messageFor, with the service-desk FORBIDDEN sentence from the F-03 contract. */
export function messageForDesk(code: string | undefined): FriendlyMessage {
  if (code === 'FORBIDDEN') return DESK_FORBIDDEN;
  return messageFor(code);
}
