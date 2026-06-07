import { useEffect, useState } from "react";

type Msg = {
  side: "PRO" | "CON";
  voice: string;
  text: string;
  mine?: boolean;
};

const SCRIPT: Msg[] = [
  {
    side: "PRO",
    voice: "보이스 03",
    text: "기후보다 성장을 우선하면, 관리할 경제 자체가 사라집니다. 이건 생존의 문제예요.",
  },
  {
    side: "CON",
    voice: "보이스 07",
    text: "당신이 제안하는 전환 속도는 개발도상국을 붕괴시킵니다. 그 비용은 누가 부담하죠?",
  },
  {
    side: "PRO",
    voice: "보이스 11 (나)",
    text: "무대응의 비용은 복리로 쌓입니다. 붕괴가 아니라 전환에 보조금을 써야 해요.",
    mine: true,
  },
  {
    side: "CON",
    voice: "보이스 07",
    text: "보조금은 신뢰를 전제로 합니다. 그 신뢰를 제도가 감당할 수 있다는 증명이 없어요.",
  },
];

export function ChamberPreview() {
  const [count, setCount] = useState(2);
  const [typing, setTyping] = useState(true);
  const [timer, setTimer] = useState(164); // 2:44

  useEffect(() => {
    const t = setInterval(() => {
      setTyping((v) => !v);
      setCount((c) => (c >= SCRIPT.length ? 2 : c + 1));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTimer((s) => (s <= 0 ? 164 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <section className="animate-fade-up [animation-delay:300ms] relative">
      <div className="absolute inset-0 -z-10 bg-accent/10 blur-[120px] rounded-full" />
      <div className="relative bg-surface border border-border rounded-xl overflow-hidden max-w-sm mx-auto shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-surface-elevated">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              챔버 402
            </span>
            <span className="text-xs font-bold leading-tight">기후 vs. 성장</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-destructive rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-destructive tracking-tighter">
              LIVE {mm}:{ss}
            </span>
          </div>
        </div>

        {/* Chat */}
        <div className="p-4 space-y-3 h-80 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.04)_1px,_transparent_0)] [background-size:18px_18px]">
          {SCRIPT.slice(0, count).map((m, i) => (
            <div key={i} className={`space-y-1 ${m.mine ? "items-end flex flex-col" : ""}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] font-bold ${m.side === "PRO" ? "text-pro" : "text-con"}`}
                >
                  [{m.side === "PRO" ? "찬성" : "반대"}]
                </span>
                <span className="font-mono text-[10px] font-bold text-foreground">
                  {m.voice}
                </span>
              </div>
              <p
                className={`text-sm leading-snug p-3 max-w-[88%] border ${
                  m.mine
                    ? "bg-accent/10 border-accent/30 text-foreground rounded-tl-xl rounded-b-xl"
                    : m.side === "PRO"
                      ? "bg-white/5 border-white/5 text-foreground/90 rounded-tr-xl rounded-b-xl"
                      : "bg-white/5 border-white/5 text-foreground/90 rounded-tl-xl rounded-b-xl"
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2 pl-1">
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                보이스 07 입력 중
              </span>
              <span className="flex gap-1">
                <span className="size-1.5 bg-muted-foreground rounded-full animate-typing" />
                <span
                  className="size-1.5 bg-muted-foreground rounded-full animate-typing"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="size-1.5 bg-muted-foreground rounded-full animate-typing"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </div>
          )}
        </div>

        {/* Dock */}
        <div className="p-3 border-t border-border bg-surface-elevated space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 bg-accent/10 border border-accent/30 p-2 rounded-sm text-center">
              <div className="text-[8px] uppercase text-accent font-bold tracking-widest">
                내 입장
              </div>
              <div className="text-xs font-bold tracking-tight">배정됨 · 찬성</div>
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 p-2 rounded-sm text-center">
              <div className="text-[8px] uppercase text-muted-foreground tracking-widest">
                언마스크 투표
              </div>
              <div className="text-xs font-bold">3 / 8 준비</div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              placeholder="당신의 논거를 전송하세요…"
              className="flex-1 bg-background border border-border rounded-sm px-3 text-xs h-9 placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
            />
            <button
              type="button"
              className="h-9 px-4 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-accent transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
