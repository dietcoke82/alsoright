import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FLOATING_OPINIONS } from "@/lib/game";
import { buildLobbyConnection } from "@/lib/signalr";
import { fetchStats, type StatsInfo } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "니맞내맞 — 당신의 입장이 배정됩니다" },
      { name: "description", content: "관점 교환 소셜 추리 토론 게임. 배정된 입장을 변호하고, 상대의 진짜 생각을 읽어라." },
    ],
  }),
  component: Landing,
});

const TERMS_KEY = "alsoright:terms-accepted";

function Landing() {
  const nav = useNavigate();
  const [stats, setStats] = useState<StatsInfo>({ activeGames: 0, todayRooms: 0, recentDebate: null });
  const [showTerms, setShowTerms] = useState(false);
  const [cardSide, setCardSide] = useState<"찬성" | "반대">("찬성");

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    const hub = buildLobbyConnection();
    hub.on("StatsUpdated", ({ activeGames, todayRooms }: { activeGames: number; todayRooms: number }) => {
      setStats(prev => ({ ...prev, activeGames, todayRooms }));
    });
    hub.start().catch(() => {});
    return () => { hub.stop(); };
  }, []);

  // 카드 2초마다 찬/반 토글
  useEffect(() => {
    const t = setInterval(() => setCardSide(s => s === "찬성" ? "반대" : "찬성"), 2200);
    return () => clearInterval(t);
  }, []);

  const handleStart = () => {
    if (localStorage.getItem(TERMS_KEY)) nav({ to: "/lobby" });
    else setShowTerms(true);
  };

  const handleAccept = () => {
    localStorage.setItem(TERMS_KEY, "1");
    setShowTerms(false);
    nav({ to: "/lobby" });
  };

  const isPro = cardSide === "찬성";

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-hidden">

      {/* 배경: 그리드 + 부유 텍스트 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        {FLOATING_OPINIONS.map((op, i) => (
          <span
            key={op}
            className="absolute font-mono text-[11px] text-muted-foreground/20 whitespace-nowrap animate-float select-none"
            style={{
              top: `${(i * 83) % 95}%`,
              left: `${(i * 137) % 90}%`,
              animationDelay: `${(i * 1.3) % 8}s`,
              animationDuration: `${18 + (i % 7) * 3}s`,
            }}
          >
            {op}
          </span>
        ))}
      </div>
      {/* 중앙 집중 빛 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,transparent_40%,var(--background)_100%)]" />

      {/* NAV */}
      <nav className="relative z-10 max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-bold tracking-tight text-lg">니맞내맞</span>
        {stats.activeGames > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/50 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {stats.activeGames}개 진행중
            </span>
          </div>
        )}
      </nav>

      {/* HERO */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-6 pb-16 text-center">

        {/* 뱃지 */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-surface/60 backdrop-blur-sm animate-fade-up">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">관점 교환 토론 게임</span>
        </div>

        {/* 헤드라인 */}
        <h3 className="animate-fade-up [animation-delay:100ms] text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95]">
          <span className="text-muted-foreground/60">내 생각 아닙니다.</span>
          <br />
          <span className="text-foreground">근데 지금부터 제 생각입니다.</span>
        </h3>

    
        {/* 역할 카드 프리뷰 */}
        <div className="mt-10 animate-fade-up [animation-delay:300ms]">
          <div
            className={`relative w-52 sm:w-60 aspect-[3/4] rounded-xl border-2 p-6 flex flex-col items-center justify-center transition-all duration-700 ${
              isPro
                ? "border-pro/50 shadow-[0_0_40px_rgba(34,197,94,0.15)]"
                : "border-con/50 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
            } bg-surface/80 backdrop-blur-sm`}
          >
            <div className="absolute top-3 left-3 right-3 flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">
              <span>ROLE</span>
              <span>CARD</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-3">
              당신의 역할
            </div>
            <div
              className={`text-6xl font-bold tracking-tighter transition-all duration-500 ${
                isPro ? "text-pro" : "text-con"
              }`}
            >
              {cardSide}
            </div>
            <div className="mt-4 text-xs text-muted-foreground px-2 leading-relaxed">
              {isPro ? "이 주장을 옹호하세요" : "이 주장을 반박하세요"}
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-center font-mono text-[9px] text-muted-foreground/40 uppercase tracking-widest animate-pulse">
              무작위 배정
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleStart}
          className="group mt-10 inline-flex items-center gap-3 px-10 py-4 bg-foreground text-background font-bold tracking-widest text-sm uppercase rounded-sm hover:bg-accent transition-all duration-200 animate-fade-up [animation-delay:400ms] active:scale-95"
        >
          지금 시작하기
          <span className="transition-transform group-hover:translate-x-1.5">→</span>
        </button>

        {/* HOW IT WORKS */}
        <div className="mt-20 grid grid-cols-3 gap-3 sm:gap-6 max-w-xl w-full animate-fade-up [animation-delay:500ms]">
          {[
            { step: "01", title: "입장 배정", desc: "찬성 또는 반대\n무작위로 배정" },
            { step: "02", title: "시간제 토론", desc: "제한된 시간안에\n 변호" },
            { step: "03", title: "언마스킹", desc: "진짜 입장이\n모두에게 공개" },
          ].map((s) => (
            <div key={s.step} className="bg-surface/50 border border-border rounded-sm p-3 sm:p-4 text-left">
              <div className="font-mono text-[10px] text-muted-foreground/50 mb-1">{s.step}</div>
              <div className="font-bold text-sm tracking-tight mb-1">{s.title}</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* STATS */}
        <div className="mt-10 flex items-center gap-10 font-mono animate-fade-up [animation-delay:600ms]">
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tighter text-accent">{stats.activeGames}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">진행중</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tighter">{stats.todayRooms}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">오늘 토론</div>
          </div>
        </div>

        {/* 최근 토론 결과 */}
        {stats.recentDebate && (
          <div className="mt-6 w-full max-w-xs animate-fade-up [animation-delay:700ms]">
            <div className="bg-surface/60 border border-border rounded-sm p-4 text-left backdrop-blur-sm">
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
                최근 토론
              </div>
              <p className="text-sm font-bold tracking-tight mb-3 line-clamp-1 text-foreground/90">
                "{stats.recentDebate.topic}"
              </p>
              <div className="flex h-1 rounded-full overflow-hidden mb-2">
                <div className="bg-pro" style={{ width: `${stats.recentDebate.pro}%` }} />
                <div className="bg-con" style={{ width: `${stats.recentDebate.con}%` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-pro">찬성 {stats.recentDebate.pro}%</span>
                <span className={`font-bold ${stats.recentDebate.winner === "찬성" ? "text-pro" : stats.recentDebate.winner === "반대" ? "text-con" : "text-foreground"}`}>
                  {stats.recentDebate.winner} 승
                </span>
                <span className="text-con">반대 {stats.recentDebate.con}%</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 약관 모달 */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-surface border border-border rounded-sm shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">개인정보 수집 동의</div>
              <h2 className="text-base font-bold tracking-tight">서비스 이용 전 확인해주세요</h2>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm text-foreground/80 max-h-56 overflow-y-auto">
              {[
                ["수집 정보", "접속 IP 주소"],
                ["수집 목적", "서비스 보안 및 악용 방지"],
                ["보관 기간", "입장일로부터 90일 후 자동 삭제"],
                ["제3자 제공", "법령에 의한 경우 외 제공 없음"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="font-bold text-foreground shrink-0 w-20">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                닉네임·이메일 등 개인 식별 정보는 수집하지 않습니다.
              </p>
            </div>
            <div className="px-6 pb-6 pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 h-11 bg-foreground text-background font-bold text-sm tracking-widest uppercase rounded-sm hover:bg-accent transition-colors"
              >
                동의하고 시작
              </button>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="px-5 h-11 border border-border rounded-sm text-sm hover:border-foreground transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
