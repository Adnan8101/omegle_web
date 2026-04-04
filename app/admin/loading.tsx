export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Loading admin page...</p>
      </div>
    </div>
  );
}
