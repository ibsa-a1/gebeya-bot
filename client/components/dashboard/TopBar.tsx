interface TopBarProps {
  user: { name: string; email: string | null };
  currentTenant: { name: string; role: string } | null;
}

export function TopBar({ user, currentTenant }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
      <div className="flex items-center gap-2.5">
        {currentTenant && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-market-green opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-market-green" />
            </span>
            <span className="text-sm font-medium text-ink/70">{currentTenant.name} is live</span>
          </>
        )}
      </div>
      <div className="text-sm text-ink/60">
        {user.name}
        {currentTenant && <span className="ml-2 text-ink/40">· {currentTenant.role}</span>}
      </div>
    </header>
  );
}
