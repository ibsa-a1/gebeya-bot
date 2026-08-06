export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="text-2xl font-semibold tracking-tight text-indigo">Gebeya Bot</div>
          <div className="tilet-rule w-16" />
        </div>
        {children}
      </div>
    </div>
  );
}
