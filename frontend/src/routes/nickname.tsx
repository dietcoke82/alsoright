import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { randomNick, setNick } from "@/lib/game";

export const Route = createFileRoute("/nickname")({
  head: () => ({ meta: [{ title: "닉네임 입력 — 니맞내맞" }] }),
  component: NicknamePage,
});

function NicknamePage() {
  const nav = useNavigate();
  const [name, setName] = useState("");

  const submit = () => {
    const final = name.trim() || randomNick();
    setNick(final);
    nav({ to: "/lobby" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <nav className="border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm font-bold tracking-tight text-foreground">
              <span>니</span>
              <span>맞</span>
              <span>내</span>
              <span>맞</span>
            </div>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            STEP 01 / 02
          </span>
        </div>
      </nav>

      <main className="flex-1 grid place-items-center px-6">
        <div className="w-full max-w-md animate-fade-up">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">
            ━ 로그인 없음 ━
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-2">
            닉네임을 입력하세요
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-10">
            본명은 필요 없습니다. 한 라운드만 살아남는 정체입니다.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="예: 철학자감자"
              className="w-full h-14 px-5 bg-surface border border-border rounded-sm text-lg font-bold tracking-tight placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />

            <button
              type="button"
              onClick={() => setName(randomNick())}
              className="w-full h-11 border border-border rounded-sm text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              🎲 랜덤 생성
            </button>

            <button
              type="button"
              onClick={submit}
              className="w-full h-14 bg-foreground text-background rounded-sm font-bold tracking-widest text-sm uppercase hover:bg-accent transition-colors"
            >
              입장 →
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {["차분한고양이", "분노한토끼", "철학자감자"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setName(n)}
                className="px-3 py-1 text-xs font-mono border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
