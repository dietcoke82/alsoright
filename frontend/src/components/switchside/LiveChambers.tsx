type Chamber = {
  id: string;
  topic: string;
  phase: string;
  remaining: string;
  remainingHot?: boolean;
  proPct: number;
  voices: string[];
  extra?: number;
};

const chambers: Chamber[] = [
  {
    id: "402",
    topic: "인공지능에게 인격권을 부여해야 한다.",
    phase: "단계: 교차 신문",
    remaining: "2:44 남음",
    remainingHot: true,
    proPct: 65,
    voices: ["03", "07"],
    extra: 9,
  },
  {
    id: "318",
    topic: "프라이버시는 20세기의 낡은 개념이다.",
    phase: "단계: 입론",
    remaining: "8:12 남음",
    proPct: 48,
    voices: ["14"],
    extra: 4,
  },
  {
    id: "511",
    topic: "의무 투표제가 현대 민주주의를 강화한다.",
    phase: "단계: 반론",
    remaining: "5:01 남음",
    proPct: 32,
    voices: ["02", "09", "12"],
    extra: 6,
  },
  {
    id: "271",
    topic: "소셜 미디어는 인류 문명에 순손실이었다.",
    phase: "단계: 교차 신문",
    remaining: "1:08 남음",
    remainingHot: true,
    proPct: 71,
    voices: ["05", "11"],
    extra: 14,
  },
];

export function LiveChambers() {
  return (
    <section className="animate-fade-up [animation-delay:150ms]">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2 text-foreground">
          <span className="size-1.5 bg-accent rounded-full animate-pulse-dot" />
          실시간 토론 챔버
        </h2>
        <span className="font-mono text-xs text-muted-foreground">12,042명 접속</span>
      </div>

      <div className="grid gap-px bg-border overflow-hidden rounded-sm ring-1 ring-border">
        {chambers.map((c) => (
          <div
            key={c.id}
            className="bg-background p-5 sm:p-6 group cursor-pointer hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    챔버 {c.id}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 leading-snug group-hover:text-accent transition-colors">
                  {c.topic}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase text-muted-foreground">
                  <span>{c.phase}</span>
                  <span className={c.remainingHot ? "text-accent" : ""}>
                    {c.remaining}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="flex flex-col gap-1 items-end">
                  <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-pro" style={{ width: `${c.proPct}%` }} />
                    <div className="h-full bg-con" style={{ width: `${100 - c.proPct}%` }} />
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground tracking-tight">
                    찬성 {c.proPct}% · 반대 {100 - c.proPct}%
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {c.voices.map((v) => (
                    <div
                      key={v}
                      className="size-8 rounded-full bg-surface-elevated border-2 border-background grid place-items-center text-[10px] font-mono font-bold"
                    >
                      {v}
                    </div>
                  ))}
                  {c.extra ? (
                    <div className="size-8 rounded-full bg-surface border-2 border-background grid place-items-center text-[10px] font-mono text-muted-foreground">
                      +{c.extra}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
