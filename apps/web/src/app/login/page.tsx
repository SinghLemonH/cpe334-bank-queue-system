'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, homeFor, User } from '@/lib/api';
import { FriendlyMessage, messageFor } from '@/lib/errors';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  TicketIcon,
  UserIcon,
  WaveIcon,
} from '@/components/icons';

const inputClass =
  'block w-full rounded-t-md border-0 border-b border-stone-300 bg-stone-100/80 py-3 pl-10 pr-3 text-sm text-stone-900 ' +
  'placeholder:text-stone-400 focus:border-stone-900 focus:bg-stone-100 focus:outline-none focus:ring-0 transition-colors';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FriendlyMessage | null>(null);

  // Already signed in? Go straight to the role's home page.
  useEffect(() => {
    api<User>('/auth/me')
      .then((user) => router.replace(homeFor(user.role)))
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError(messageFor('VALIDATION_FAILED'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const user = await api<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      router.replace(homeFor(user.role));
    } catch (err) {
      setError(messageFor(err instanceof ApiError ? err.code : undefined));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f1ec] p-4 font-sans sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] md:grid-cols-[1.15fr_1fr]">
        {/* Left: brand panel (hidden on small screens) */}
        <section className="relative hidden flex-col justify-between p-12 md:flex lg:p-16">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
              <TicketIcon size={30} strokeWidth={1.75} />
            </div>

            <h1 className="mt-12 text-5xl font-bold leading-[1.1] tracking-tight text-stone-900">
              Hello
              <br />
              <span className="inline-flex items-center gap-3">
                Branch Queue!
                <WaveIcon size={40} strokeWidth={1.5} className="text-amber-500" />
              </span>
            </h1>

            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-stone-600">
              Take a number, track your turn and get served without standing in line. Tellers call, serve
              and complete tickets from one desk.
            </p>
            <p className="mt-2 max-w-sm text-sm text-stone-400">รับบัตรคิว ติดตามลำดับ และรับบริการได้ไม่ต้องยืนรอ</p>

            {/* Decorative "now serving" ticket */}
            <div className="mt-10 inline-flex items-center gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white">
                <ClockIcon size={22} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400">Now serving</p>
                <p className="text-2xl font-bold tabular-nums text-stone-900">D001</p>
              </div>
              <div className="ml-4 border-l border-dashed border-stone-300 pl-4 text-xs text-stone-500">
                Deposit &amp;
                <br />
                Withdrawal
              </div>
            </div>
          </div>

          <p className="mt-12 text-xs text-stone-400">© 2026 Bank Branch Queue · CPE 334. Synthetic demo data only.</p>
        </section>

        {/* Right: sign-in form */}
        <section className="relative flex flex-col justify-center border-stone-100 px-6 py-10 sm:px-12 md:border-l md:py-16 md:shadow-[-24px_0_40px_-32px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-stone-900">
            <TicketIcon size={22} className="md:hidden" />
            <span className="text-lg font-bold tracking-tight">Bank Branch Queue</span>
          </div>

          <form onSubmit={onSubmit} className="mt-12 w-full max-w-sm" aria-label="Sign in" noValidate>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">Welcome back!</h2>
            <p className="mt-1 text-xs text-stone-500">
              Sign in with your branch account. <span className="text-stone-400">เข้าสู่ระบบด้วยบัญชีของสาขา</span>
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-stone-600">
                  Username
                </label>
                <div className="relative">
                  <UserIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    placeholder="e.g. customer1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-stone-600">
                  Password
                </label>
                <div className="relative">
                  <LockIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide characters' : 'Show characters'}
                    aria-controls="password"
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                data-testid="login-error"
                className="mt-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              >
                <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{error.en}</p>
                  <p className="text-red-600/80">{error.th}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <SpinnerIcon size={18} /> Signing in...
                </>
              ) : (
                <>
                  Sign in <ArrowRightIcon size={18} />
                </>
              )}
            </button>

            <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-stone-400">
              <ShieldCheckIcon size={16} className="mt-px shrink-0" />
              Accounts are created by the branch. Ask staff if you cannot sign in.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
