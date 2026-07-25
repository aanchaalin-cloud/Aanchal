export default function OrderDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-stone-100" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 rounded-sm border border-stone-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-stone-100 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-stone-50" />
              ))}
            </div>
          </div>
          <div className="h-40 rounded-sm border border-stone-200 bg-white p-5">
            <div className="h-4 w-16 rounded bg-stone-100 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 rounded bg-stone-50" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-sm border border-stone-200 bg-white p-5">
              <div className="h-4 w-20 rounded bg-stone-100 mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-3/4 rounded bg-stone-50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
