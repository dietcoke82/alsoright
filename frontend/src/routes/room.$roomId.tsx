import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROOMS, getNick, RANDOM_NICKS } from "@/lib/game";

export const Route = createFileRoute("/room/$roomId")({
  head: () => ({ meta: [{ title: "토론방 — alsoright" }] }),
  component: RoomPage,
});

type Phase = "waiting" | "reveal" | "debate" | "vote" | "result";

type Player = {
  name: string;
  role: "찬성" | "반대";
  ready: boolean;
  isMe?: boolean;
};

type Message = { author: string; role: "찬성" | "반대"; text: string; t: number };

const SEED_LINES = [
  { role: "찬성" as const, text: "기본소득은 자동화 시대의 안전망이다." },
  { role: "반대" as const, text: "재원은 어디서 충당하죠? 증세 없이는 불가능합니다." },
  { role: "찬성" as const, text: "실업자 보호와 소비 진작이 동시에 가능함." },
  { role: "반대" as const, text: "근로 의욕 감소가 가장 큰 부작용입니다." },
  { role: "찬성" as const, text: "핀란드 실험에서 노동 의욕은 감소하지 않았다." },
  { role: "반대" as const, text: "그 규모와 우리 인구의 차이를 무시한 비교예요." },
];

function RoomPage() {
  const { roomId } = Route.useParams();
  const nav = useNavigate();
  const room = ROOMS.find((r) => r.id === roomId) ?? ROOMS[0];

  const [nick, setNickState] = useState<string | null>(null);
  useEffect(() => {
    const n = getNick();
    if (!n) nav({ to: "/nickname" });
    else setNickState(n);
  }, [nav]);

  // Players
  const players: Player[] = useMemo(() => {
    const others = RANDOM_NICKS.filter((n) => n !== nick).slice(0, 5);
    const list: Player[] = others.map((name, i) => ({
      name,
      role: i % 2 === 0 ? "찬성" : "반대",
      ready: true,
    }));
    list.splice(2, 0, {
      name: nick ?? "나",
      role: Math.random() > 0.5 ? "찬성" : "반대",
      ready: false,
      isMe: true,
    });
    return list;
  }, [nick]);

  const me = players.find((p) => p.isMe);

  const [phase, setPhase] = useState<Phase>("waiting");
  const [meReady, setMeReady] = useState(false);
  const [timer, setTimer] = useState(0);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [voted, setVoted] = useState<"찬성" | "반대" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Phase machine
  useEffect(() => {
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("debate"), 3500);
      return () => clearTimeout(t);
    }
    if (phase === "debate") {
      setTimer(60);
    }
    if (phase === "vote") {
      setTimer(20);
    }
  }, [phase]);

  // Countdown — only runs after timer has been initialized for the phase
  useEffect(() => {
    if (phase !== "debate" && phase !== "vote") return;
    if (timer <= 0) return; // wait for phase-init effect to set timer first
    const t = setTimeout(() => {
      setTimer((s) => {
        const next = s - 1;
        if (next <= 0) {
          if (phase === "debate") setPhase("vote");
          else if (phase === "vote") setPhase("result");
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [timer, phase]);

  // Autoplay seed messages during debate
  useEffect(() => {
    if (phase !== "debate") return;
    let i = 0;
    const tick = setInterval(() => {
      const line = SEED_LINES[i % SEED_LINES.length];
      const author =
        players.find((p) => p.role === line.role && !p.isMe)?.name ?? "참가자";
      setMsgs((m) => [...m, { ...line, author, t: Date.now() }]);
      i++;
    }, 4500);
    return () => clearInterval(tick);
  }, [phase, players]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const sendMsg = () => {
    if (!draft.trim() || !me) return;
    setMsgs((m) => [...m, { author: me.name, role: me.role, text: draft.trim(), t: Date.now() }]);
    setDraft("");
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Top bar */}
      <nav className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/lobby" className="flex items-center gap-2 shrink-0">
            <div className="size-5 bg-foreground rotate-45 grid place-items-center">
              <div className="size-2 bg-background" />
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              ← 로비
            </span>
          </Link>
          <div className="min-w-0 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              방 #{room.id}
            </div>
            <div className="text-sm font-bold tracking-tight truncate">{room.topic}</div>
          </div>
          <div className="shrink-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <PhaseChip phase={phase} />
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 py-6">
        {phase === "waiting" && (
          <WaitingRoom
            players={players}
            topic={room.topic}
            ready={meReady}
            onReady={() => {
              setMeReady(true);
              setTimeout(() => setPhase("reveal"), 800);
            }}
          />
        )}

        {(phase === "debate" || phase === "vote") && (
          <DebateView
            timer={`${mm}:${ss}`}
            players={players}
            msgs={msgs}
            draft={draft}
            setDraft={setDraft}
            sendMsg={sendMsg}
            me={me!}
            scrollRef={scrollRef}
            voting={phase === "vote"}
            voted={voted}
            onVote={(side) => {
              setVoted(side);
              setTimeout(() => setPhase("result"), 1200);
            }}
            topic={room.topic}
          />
        )}


        {phase === "result" && <ResultView players={players} voted={voted} topic={room.topic} />}
      </div>

      {/* Overlay: role reveal */}
      {phase === "reveal" && me && <RoleRevealOverlay role={me.role} topic={room.topic} />}
    </div>
  );
}

function PhaseChip({ phase }: { phase: Phase }) {
  const map: Record<Phase, { label: string; color: string }> = {
    waiting: { label: "대기방", color: "bg-pro/15 text-pro" },
    reveal: { label: "역할 공개", color: "bg-accent/15 text-accent" },
    debate: { label: "토론 중", color: "bg-destructive/15 text-destructive" },
    vote: { label: "투표 중", color: "bg-con/15 text-con" },
    result: { label: "결과 공개", color: "bg-accent/15 text-accent" },
  };
  const m = map[phase];
  return (
    <span className={`px-2 py-1 rounded-sm font-mono text-[10px] uppercase tracking-widest ${m.color}`}>
      ● {m.label}
    </span>
  );
}

function WaitingRoom({
  players,
  topic,
  ready,
  onReady,
}: {
  players: Player[];
  topic: string;
  ready: boolean;
  onReady: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 animate-fade-up">
      <aside className="bg-surface border border-border rounded-sm p-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          참가자 ({players.length}/10)
        </h3>
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.name} className="flex items-center gap-3">
              <span className={`size-2 rounded-full ${p.isMe || p.ready ? "bg-pro" : "bg-muted-foreground/40"}`} />
              <span className={`text-sm flex-1 ${p.isMe ? "font-bold text-accent" : ""}`}>
                {p.name} {p.isMe && "(나)"}
              </span>
              {p.ready && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-pro">준비</span>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
          ━ 오늘의 주제 ━
        </div>
        <div className="relative max-w-xl w-full bg-surface-elevated border border-border rounded-lg p-10 text-center shadow-2xl">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground rounded-full font-mono text-[10px] uppercase tracking-widest font-bold">
            DEBATE CARD
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-balance">
            {topic}
          </h2>
          <p className="mt-6 text-sm text-muted-foreground">
            준비 완료를 누르면 입장이 무작위로 배정됩니다.
          </p>
        </div>

        <button
          type="button"
          disabled={ready}
          onClick={onReady}
          className={`mt-10 px-12 py-4 rounded-sm font-bold tracking-widest text-sm uppercase transition-colors ${
            ready
              ? "bg-pro/20 text-pro border border-pro/40"
              : "bg-foreground text-background hover:bg-accent"
          }`}
        >
          {ready ? "✓ 준비 완료" : "준비 완료"}
        </button>
      </main>
    </div>
  );
}

function RoleRevealOverlay({ role, topic }: { role: "찬성" | "반대"; topic: string }) {
  const color = role === "찬성" ? "text-pro border-pro/50" : "text-con border-con/50";
  const sub =
    role === "찬성"
      ? "이 주장을 옹호하세요"
      : "이 주장을 반박하세요";
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm grid place-items-center animate-fade-up">
      <div className={`relative max-w-md w-[90%] aspect-[3/4] border-2 rounded-lg ${color} bg-surface-elevated p-8 flex flex-col items-center justify-center text-center shadow-2xl`}>
        <div className="absolute top-4 left-4 right-4 flex justify-between font-mono text-[10px] uppercase tracking-widest opacity-60">
          <span>ROLE</span>
          <span>CARD</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
          ━ 당신의 역할 ━
        </div>
        <div className={`text-7xl font-bold tracking-tighter mb-6 ${color.split(" ")[0]}`}>
          {role}
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          {sub}
        </div>
        <p className="text-lg font-bold leading-snug text-foreground">
          "{topic}"
        </p>
        <div className="absolute bottom-4 left-4 right-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
          잠시 후 토론이 시작됩니다…
        </div>
      </div>
    </div>
  );
}

function DebateView({
  timer,
  players,
  msgs,
  draft,
  setDraft,
  sendMsg,
  me,
  scrollRef,
  voting,
  voted,
  onVote,
  topic,
}: {
  timer: string;
  players: Player[];
  msgs: Message[];
  draft: string;
  setDraft: (v: string) => void;
  sendMsg: () => void;
  me: Player;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  voting: boolean;
  voted: "찬성" | "반대" | null;
  onVote: (side: "찬성" | "반대") => void;
  topic: string;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_240px] gap-4 animate-fade-up">
      <div className="flex flex-col bg-surface border border-border rounded-sm overflow-hidden h-[calc(100vh-9rem)]">
        {/* Round bar */}
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              ROUND 1
            </div>
            <div className="text-sm font-bold tracking-tight">
              {voting ? "최종 투표" : "자유 토론"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              남은 시간
            </div>
            <div className={`font-mono text-2xl font-bold tracking-tight ${timer < "00:30" ? "text-destructive animate-pulse" : ""}`}>
              {timer}
            </div>
          </div>
        </div>

        {/* AI host banner */}
        <div className="px-5 py-2.5 border-b border-border bg-accent/5 flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
            사회자
          </span>
          <span className="text-xs text-foreground/80">
            {voting ? "토론 종료! 투표가 진행 중입니다." : "상대 주장에 반론을 제시하세요."}
          </span>
        </div>


        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.03)_1px,_transparent_0)] [background-size:18px_18px]"
        >
          {msgs.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10 font-mono uppercase tracking-widest text-[10px]">
              ━ 첫 발언을 기다리는 중 ━
            </div>
          )}
          {msgs.map((m, i) => {
            const mine = m.author === me.name;
            return (
              <div key={i} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                      m.role === "찬성" ? "text-pro" : "text-con"
                    }`}
                  >
                    [{m.role}]
                  </span>
                  <span className="text-xs font-bold">{m.author}</span>
                </div>
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-sm leading-snug rounded-lg ${
                    mine
                      ? "bg-accent text-accent-foreground rounded-br-sm"
                      : "bg-surface-elevated border border-border rounded-bl-sm"
                  }`}
                  style={{ wordBreak: "keep-all" }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-surface-elevated flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMsg()}
            placeholder={`[${me.role}] 입장에서 발언하세요…`}
            className="flex-1 h-11 px-4 bg-background border border-border rounded-sm text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={sendMsg}
            className="h-11 px-6 bg-foreground text-background font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-accent transition-colors"
          >
            전송
          </button>
        </div>
      </div>

      {/* Side: players */}
      <aside className="bg-surface border border-border rounded-sm p-4 h-fit">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          참가자 ({players.length})
        </h3>
        <ul className="space-y-2.5">
          {players.map((p) => (
            <li key={p.name} className="flex items-center gap-2">
              <span className="size-2 bg-pro rounded-full animate-pulse-dot" />
              <span className={`text-xs flex-1 ${p.isMe ? "font-bold text-accent" : ""}`}>
                {p.name} {p.isMe && "(나)"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                ?
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-4 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            투표
          </div>
          <div className="text-xs text-foreground/70">라운드 종료 후 공개</div>
        </div>
      </aside>

      {/* Vote overlay: takes over screen when debate timer hits 0 */}
      {voting && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-up">
          <VoteBanner topic={topic} voted={voted} onVote={onVote} />
        </div>
      )}
    </div>
  );
}

function VoteBanner({
  topic,
  voted,
  onVote,
}: {
  topic: string;
  voted: "찬성" | "반대" | null;
  onVote: (side: "찬성" | "반대") => void;
}) {
  const sides: Array<{ key: "찬성" | "반대"; cls: string; sel: string }> = [
    { key: "찬성", cls: "border-pro/40 text-pro hover:bg-pro/10", sel: "bg-pro text-background border-pro" },
    { key: "반대", cls: "border-con/40 text-con hover:bg-con/10", sel: "bg-con text-background border-con" },
  ];
  return (
    <div className="w-full max-w-2xl bg-surface border border-border rounded-sm p-8 shadow-2xl animate-fade-up">
      <div className="text-center mb-6">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-accent font-bold mb-3">
          ━ 투표 시간 ━
        </div>
        <div className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
          "{topic}"
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-3">
          가장 설득력 있던 입장에 한 표를 던지세요
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sides.map((s) => {
          const selected = voted === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => !voted && onVote(s.key)}
              disabled={!!voted}
              className={`h-24 rounded-sm border-2 font-bold text-2xl tracking-tight transition-all ${
                selected ? s.sel : voted ? "border-border opacity-30" : s.cls
              }`}
            >
              {selected ? `✓ ${s.key}` : s.key}
            </button>
          );
        })}
      </div>
      {voted && (
        <div className="text-center mt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
          결과 공개 중...
        </div>
      )}
    </div>
  );
}

function VoteView({

  voted,
  onVote,
  timer,
  topic,
}: {
  voted: "찬성" | "반대" | null;
  onVote: (side: "찬성" | "반대") => void;
  timer: string;
  topic: string;
}) {
  const sides: Array<{
    key: "찬성" | "반대";
    sub: string;
    selectedCls: string;
    textCls: string;
    badgeCls: string;
  }> = [
    {
      key: "찬성",
      sub: "이 주장에 동의합니다",
      selectedCls: "border-pro bg-pro/10 scale-105 shadow-2xl",
      textCls: "text-pro",
      badgeCls: "bg-pro text-background",
    },
    {
      key: "반대",
      sub: "이 주장에 반대합니다",
      selectedCls: "border-con bg-con/10 scale-105 shadow-2xl",
      textCls: "text-con",
      badgeCls: "bg-con text-background",
    },
  ];
  return (
    <div className="max-w-3xl mx-auto py-10 animate-fade-up">
      <div className="text-center mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
          ━ 토론 종료 · 최종 투표 ━
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
          "{topic}"
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          토론을 듣고 당신의 <span className="text-accent italic">진짜 입장</span>을 선택하세요
        </p>
        <div className="mt-4 font-mono text-2xl font-bold text-destructive animate-pulse">
          {timer}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sides.map((s) => {
          const selected = voted === s.key;
          const dim = voted && !selected;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onVote(s.key)}
              className={`aspect-[4/5] rounded-lg border-2 p-8 flex flex-col items-center justify-center text-center transition-all ${
                selected
                  ? s.selectedCls
                  : dim
                    ? "border-border bg-surface opacity-40 hover:opacity-70"
                    : "border-border bg-surface hover:border-foreground/40 hover:-translate-y-1"
              }`}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                VOTE
              </div>
              <div className={`text-6xl sm:text-7xl font-bold tracking-tighter mb-4 ${s.textCls}`}>
                {s.key}
              </div>
              <div className="text-sm text-muted-foreground">{s.sub}</div>
              {selected && (
                <div className={`mt-6 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest font-bold ${s.badgeCls}`}>
                  ✓ 투표 완료
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultView({
  players,
  voted,
  topic,
}: {
  players: Player[];
  voted: "찬성" | "반대" | null;
  topic: string;
}) {
  // Simulated full vote tally — counts other players' "votes" plus my own
  const otherVotes = useMemo(() => {
    return players
      .filter((p) => !p.isMe)
      .map((p) => (((p.name.charCodeAt(0) + p.name.length) % 2 === 0) ? "찬성" : "반대") as "찬성" | "반대");
  }, [players]);
  const allVotes = voted ? [...otherVotes, voted] : otherVotes;
  const pro = allVotes.filter((v) => v === "찬성").length;
  const con = allVotes.filter((v) => v === "반대").length;
  const total = Math.max(pro + con, 1);
  const proPct = Math.round((pro / total) * 100);
  const conPct = 100 - proPct;
  const winner = pro === con ? "무승부" : pro > con ? "찬성" : "반대";

  return (
    <div className="max-w-4xl mx-auto py-10 animate-fade-up">
      {/* Top: Vote result */}
      <div className="bg-surface-elevated border border-border rounded-lg p-6 sm:p-8 mb-10 shadow-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 text-center">
          ━ 최종 투표 결과 ━
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-bold tracking-tight text-balance mb-1">
          "{topic}"
        </h2>
        <div className="text-center mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">승자 · </span>
          <span className={`font-bold tracking-tight ${winner === "찬성" ? "text-pro" : winner === "반대" ? "text-con" : "text-foreground"}`}>
            {winner}
          </span>
        </div>

        <div className="flex h-12 rounded-sm overflow-hidden border border-border">
          <div
            className="bg-pro flex items-center justify-start px-3 text-background font-bold text-sm transition-all"
            style={{ width: `${proPct}%` }}
          >
            {proPct > 8 ? `찬성 ${proPct}%` : ""}
          </div>
          <div
            className="bg-con flex items-center justify-end px-3 text-background font-bold text-sm transition-all"
            style={{ width: `${conPct}%` }}
          >
            {conPct > 8 ? `반대 ${conPct}%` : ""}
          </div>
        </div>

        <div className="mt-4 flex justify-between font-mono text-[11px] uppercase tracking-widest">
          <span className="text-pro">● 찬성 {pro}표</span>
          <span className="text-muted-foreground">전체 {total}표</span>
          <span className="text-con">반대 {con}표 ●</span>
        </div>
      </div>

      {/* Unmasking */}
      <div className="text-center mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
          ━ UNMASKING ━
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
          각자가 맡은 <span className="text-accent italic">실제 포지션</span>
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((p, i) => (
          <div
            key={p.name}
            className="bg-surface-elevated border border-border rounded-lg p-6 animate-fade-up"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="size-12 rounded-full bg-background grid place-items-center text-lg font-bold">
                {p.name.charAt(0)}
              </div>
              {p.isMe && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent font-mono text-[9px] uppercase tracking-widest font-bold rounded-sm">
                  나
                </span>
              )}
            </div>
            <div className="font-bold text-lg tracking-tight mb-3">{p.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              맡은 역할
            </div>
            <div
              className={`text-3xl font-bold tracking-tighter ${
                p.role === "찬성" ? "text-pro" : "text-con"
              }`}
            >
              {p.role}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-foreground text-background rounded-sm font-bold text-xs tracking-widest uppercase hover:bg-accent transition-colors"
        >
          다음 라운드 →
        </button>
        <Link
          to="/lobby"
          className="px-8 py-3 border border-border rounded-sm font-bold text-xs tracking-widest uppercase hover:border-foreground transition-colors text-center"
        >
          로비로
        </Link>
      </div>
    </div>
  );
}
