import { AppHeader } from '@/components/AppHeader';

/** Shell for signed-in pages (/queues, /my-ticket, /operator). */
export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">{children}</main>
    </>
  );
}
