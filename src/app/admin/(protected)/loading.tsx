export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded border border-stone-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-stone-200" />
            <div className="mt-3 h-8 w-16 rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
