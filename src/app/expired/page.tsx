export default function ExpiredLinkPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">This link has expired</h1>
      <p className="mt-3 text-base text-slate-600">
        The short link you tried to open is no longer active. Contact the owner for a fresh destination.
      </p>
    </main>
  );
}
