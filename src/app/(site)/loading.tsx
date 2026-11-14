export default function SiteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
          aria-hidden
        />
        <p className="text-sm text-ink-500" role="status">
          Chargement…
        </p>
      </div>
    </div>
  );
}
