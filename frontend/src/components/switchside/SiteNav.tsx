import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-5 bg-foreground rotate-45 flex items-center justify-center transition-transform group-hover:rotate-[135deg] duration-500">
            <div className="size-2 bg-background" />
          </div>
          <span className="font-mono font-bold tracking-tighter text-base lowercase">
            alsoright
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <span className="size-1.5 bg-pro rounded-full animate-pulse-dot" />
            상태: 운영 중
          </div>
          <button
            type="button"
            className="px-4 py-1.5 bg-foreground text-background text-xs font-bold tracking-tight rounded-sm hover:bg-accent transition-colors"
          >
            홀 입장
          </button>
        </div>
      </div>
    </nav>
  );
}
