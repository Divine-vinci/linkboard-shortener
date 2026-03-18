function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-800/70 ${className}`} />;
}

export default function LoadingLinksPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
        <SkeletonBlock className="h-6 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
        <SkeletonBlock className="h-12 w-40" />
      </div>

      <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
        <SkeletonBlock className="h-6 w-48" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="h-4 w-72 max-w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
