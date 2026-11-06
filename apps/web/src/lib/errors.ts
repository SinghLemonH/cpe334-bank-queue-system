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
};

const FALLBACK: FriendlyMessage = {
  en: 'Something went wrong. Please try again.',
  th: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
};

export function messageFor(code: string | undefined): FriendlyMessage {
  return (code && MESSAGES[code]) || FALLBACK;
}
