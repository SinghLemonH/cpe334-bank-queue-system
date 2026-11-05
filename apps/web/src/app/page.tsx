export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Bank Branch Queue System</h1>
        <p className="mt-2 text-sm text-slate-600">
          CPE 334 Introduction to Software Engineering in the Age of AI Agents.
        </p>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            System Status
          </p>
          <p className="mt-1 text-sm text-emerald-600 font-medium">Scaffold initialized</p>
        </div>
      </div>
    </main>
  );
}
