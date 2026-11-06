import { AppHeader } from '@/components/AppHeader';

/** Shell for signed-in pages (/queues, /my-ticket, /operator). */
export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </>
  );
}
