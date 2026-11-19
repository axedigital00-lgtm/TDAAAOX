export default function AgentsLoading() {
  return (
    <div className="h-full flex flex-col min-h-0 bg-gray-50/50 animate-pulse">
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-4 bg-(--color-surface) border-b border-(--color-border-secondary)">
        <div className="w-12 h-12 rounded-full bg-(--color-tint-hover)" />
        <div>
          <div className="h-5 w-24 bg-(--color-tint-hover) rounded-lg mb-1.5" />
          <div className="h-3 w-48 bg-(--color-surface-tertiary) rounded" />
        </div>
        <div className="ml-auto h-9 w-36 bg-(--color-surface-tertiary) rounded-2xl" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-(--color-tint-hover) flex-shrink-0" />
          <div className="bg-(--color-surface) rounded-2xl p-4 w-64 h-16 border border-(--color-border-secondary)" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-(--color-surface) rounded-2xl h-14 border border-(--color-border-secondary)" />
          ))}
        </div>
      </div>
    </div>
  );
}
