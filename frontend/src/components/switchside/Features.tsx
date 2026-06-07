const items = [
  {
    title: "익명성 우선",
    body: "프로필도, 편견도 없습니다. 토론마다 모든 사용자는 임시 숫자 보이스가 됩니다. 순수한 담론만 남죠.",
    icon: (
      <div className="size-4 border-2 border-current rounded-full border-t-transparent" />
    ),
    accent: true,
  },
  {
    title: "입장 배정",
    body: "시스템이 당신의 편을 결정합니다. 본인의 신념이 아닌 입장을 변호하며, 상대의 논리를 체득하세요.",
    icon: <div className="w-4 h-0.5 bg-foreground" />,
  },
  {
    title: "언마스킹",
    body: "타이머가 0이 되면, 누가 신념을 가장했는지 투표합니다. 정확한 추리는 랭크로 보상됩니다.",
    icon: <div className="size-3 bg-foreground rotate-45" />,
  },
];

export function Features() {
  return (
    <section className="grid sm:grid-cols-3 gap-10 border-t border-border pt-12 animate-fade-up [animation-delay:450ms]">
      {items.map((it) => (
        <div key={it.title} className="space-y-4">
          <div
            className={`size-10 rounded grid place-items-center border ${
              it.accent
                ? "bg-accent/20 border-accent/40 text-accent"
                : "bg-white/5 border-white/10"
            }`}
          >
            {it.icon}
          </div>
          <h4 className="font-bold uppercase tracking-tight">{it.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{it.body}</p>
        </div>
      ))}
    </section>
  );
}
