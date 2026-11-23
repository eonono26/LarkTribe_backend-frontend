/**
 * Shown immediately when a link is clicked while the next page is still being
 * rendered on the server. Without this, Next.js keeps the previous page on
 * screen (only the header re-renders), which feels like the link did nothing.
 * The header/footer live in RootShell, so only the <main> area is swapped.
 */
export default function Loading() {
  return (
    <div className="container-shell pt-28 pb-16 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-6 w-48 bg-stone-100 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] bg-stone-100" />
            <div className="h-3 w-3/4 bg-stone-100 mt-3" />
            <div className="h-3 w-1/3 bg-stone-100 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
