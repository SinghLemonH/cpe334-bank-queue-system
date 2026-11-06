'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, homeFor, User } from '@/lib/api';
import { FriendlyMessage, messageFor } from '@/lib/errors';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-label="Sign in"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bank Branch Queue</h1>
          <p className="text-sm text-slate-500">Sign in / เข้าสู่ระบบ</p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Username
          <input
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        {error && (
          <div role="alert" data-testid="login-error" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            <p>{error.en}</p>
            <p>{error.th}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
