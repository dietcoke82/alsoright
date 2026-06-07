import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HOT_TOPICS, ROOMS, getNick } from "@/lib/game";

export const Route = createFileRoute("/lobby")({
  head: () => ({ meta: [{ title: "로비 — 니맞내맞" }] }),
  component: Lobby,
});

function Lobby() {
  const nav = useNavigate();
  const [nick, setNickState] = useState<string | null>(null);

  useEffect(() => {
    const n = getNick();
    if (!n) nav({ to: "/nickname" });
    else setNickState(n);
  }, [nav]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm font-bold tracking-tight text-foreground">
              <span>니</span>
              <span>맞</span>
              <span>내</span>
              <span>맞</span>
            </div>
            <span className="ml-3 hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              / 로비
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-full">
              <span className="size-1.5 bg-pro rounded-full animate-pulse-dot" />
              <span className="font-mono text-[10px] uppercase tracking-widest">{nick ?? "..."}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[220px_1fr_240px] gap-6">
        {/* LEFT: hot topics */}
        <aside className="space-y-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            🔥 인기 주제
          </h3>
          <div className="space-y-2">
            {HOT_TOPICS.map((t) => (
              <button
                key={t.id}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-surface border border-border rounded-sm hover:border-accent transition-colors group"
              >
                <span className="text-sm font-bold tracking-tight group-hover:text-accent transition-colors">
                  # {t.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{t.heat}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER: rooms */}
        <main className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="size-1.5 bg-accent rounded-full animate-pulse-dot" />
              방 목록
            </h2>
            <button className="px-4 py-2 bg-foreground text-background rounded-sm font-bold text-xs tracking-widest uppercase hover:bg-accent transition-colors">
              + 방 만들기
            </button>
          </div>

          <div className="grid gap-3">
            {ROOMS.map((r) => {
              const full = r.players >= r.capacity;
              return (
                <div
                  key={r.id}
                  className="bg-surface border border-border rounded-sm p-5 hover:border-accent/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          방 #{r.id}
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                            r.phase === "대기"
                              ? "bg-pro/15 text-pro"
                              : r.phase === "토론"
                                ? "bg-accent/15 text-accent"
                                : "bg-con/15 text-con"
                          }`}
                        >
                          {r.phase}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold tracking-tight group-hover:text-accent transition-colors">
                        {r.topic}
                      </h3>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${full ? "bg-destructive" : "bg-pro"}`}
                            style={{ width: `${(r.players / r.capacity) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {r.players} / {r.capacity}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/room/$roomId"
                      params={{ roomId: r.id }}
                      className={`shrink-0 px-5 py-2.5 rounded-sm font-bold text-xs tracking-widest uppercase transition-colors ${
                        full
                          ? "border border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                          : "bg-foreground text-background hover:bg-accent"
                      }`}
                    >
                      {full ? "관전" : "입장"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT: live stats */}
        <aside className="space-y-4">
          <div className="bg-surface border border-border rounded-sm p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              현재 접속자
            </div>
            <div className="text-3xl font-bold tracking-tighter">1,243</div>
          </div>
          <div className="bg-surface border border-border rounded-sm p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              진행중 게임
            </div>
            <div className="text-3xl font-bold tracking-tighter text-accent">83</div>
          </div>
          <div className="bg-surface border border-border rounded-sm p-4 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              내 전적
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">참여</span>
              <span className="font-mono font-bold">12</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">언마스크 적중</span>
              <span className="font-mono font-bold text-pro">7</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">정확도</span>
              <span className="font-mono font-bold text-accent">58%</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
