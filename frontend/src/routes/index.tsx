import { createFileRoute, Link } from "@tanstack/react-router";
import { FLOATING_OPINIONS } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "alsoright — 오늘은 당신의 생각이 아닙니다" },
      {
        name: "description",
        content: "실시간 소셜 디덕션 토론 게임. 익명, 배정된 입장, 마지막 언마스킹.",
      },
      { property: "og:title", content: "alsoright" },
      {
        property: "og:description",
        content: "오늘은 당신의 생각이 아닙니다. 배정된 입장을 변호하세요.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Floating opinions background */}
      <div className="absolute inset-0 pointer-events-none">
        {FLOATING_OPINIONS.map((op, i) => (
          <span
            key={op}
            className="absolute font-mono text-xs sm:text-sm text-muted-foreground/30 whitespace-nowrap animate-float"
            style={{
              top: `${(i * 83) % 95}%`,
              left: `${(i * 137) % 90}%`,
              animationDelay: `${(i * 1.3) % 8}s`,
              animationDuration: `${18 + (i % 7) * 3}s`,
            }}
          >
            "{op}"
          </span>
        ))}
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_30%,_var(--background)_85%)]" />

      {/* Top bar */}
      <nav className="relative z-10 max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <span>니</span>
          <span>맞</span>
          <span className="ml-2">내</span>
          <span className="ml-2">맞</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="size-1.5 bg-pro rounded-full animate-pulse-dot" />
          1,243명 접속 중
        </div>
      </nav>

      {/* Center */}
      <main className="relative z-10 min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-8 animate-fade-up">
          ━━━ 소셜 디덕션 디베이트 ━━━
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.85] animate-fade-up [animation-delay:100ms]">
          니맞내맞
        </h1>

        <p className="mt-10 text-xl sm:text-2xl font-bold tracking-tight animate-fade-up [animation-delay:200ms]">
          
        </p>
        <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight animate-fade-up [animation-delay:300ms]">
          <span className="text-muted-foreground">니말도 맞고</span><br></br>
          <span className="text-accent">내말도 맞다.</span>
        </p>

        <Link
          to="/nickname"
          className="group mt-14 inline-flex items-center gap-3 px-10 py-4 bg-foreground text-background font-bold tracking-widest text-sm uppercase rounded-sm hover:bg-accent transition-colors animate-fade-up [animation-delay:500ms]"
        >
          지금 시작
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>

        <div className="mt-20 grid grid-cols-3 gap-8 sm:gap-16 font-mono animate-fade-up [animation-delay:700ms]">
          {[
            { k: "1,243", v: "접속" },
            { k: "83", v: "진행중" },
            { k: "63%", v: "정확도" },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-2xl sm:text-3xl font-bold tracking-tighter">{s.k}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
