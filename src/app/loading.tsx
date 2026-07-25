export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E5D5C5] border-t-[#800020]" />
        <p className="text-sm text-[#6B6B6B]">Loading…</p>
      </div>
    </div>
  );
}
