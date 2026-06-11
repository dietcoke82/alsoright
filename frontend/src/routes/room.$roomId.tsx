import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { fetchRoom, joinRoom, getOrCreateUid, type RoomDetail } from "@/lib/api";
import { buildHubConnection, type SignalRPlayer, type VoteResultPayload } from "@/lib/signalr";

export const Route = createFileRoute("/room/$roomId")({
  head: () => ({ meta: [{ title: "토론방 — 니맞내맞" }] }),
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

function RoomPage() {
  const { roomId } = Route.useParams();
  const nav = useNavigate();

  const [myAlias, setMyAlias] = useState<string>("");
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [myRole, setMyRole] = useState<"찬성" | "반대">("찬성");

  const [phase, setPhase] = useState<Phase>("waiting");
  const [players, setPlayers] = useState<Player[]>([]);

  const [meReady, setMeReady] = useState(false);
  const [timer, setTimer] = useState(0);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [voted, setVoted] = useState<"찬성" | "반대" | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResultPayload | null>(null);
  const [extensionVoted, setExtensionVoted] = useState(false);
  const [extensionVotes, setExtensionVotes] = useState(0);
  const [extensionTotal, setExtensionTotal] = useState(0);
  const [extensionUsed, setExtensionUsed] = useState(false);
  const [showEnter, setShowEnter] = useState(true);
  const [readyPulse, setReadyPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HubConnection | null>(null);
  const sendingRef = useRef(false);

  // 입장 오버레이 1.8초 후 자동 제거
  useEffect(() => {
    const t = setTimeout(() => setShowEnter(false), 1800);
    return () => clearTimeout(t);
  }, []);

  // Join room and connect to SignalR on mount
  useEffect(() => {
    let cancelled = false;
    let hub: HubConnection | null = null;

    (async () => {
      try {
        const roomData = await fetchRoom(roomId);
        if (cancelled) return;

        if (roomData.phase !== "대기") {
          nav({ to: "/lobby" });
          return;
        }

        setRoom(roomData);

        const uid = getOrCreateUid();
        const joinData = await joinRoom(roomId, uid);
        if (cancelled) return;

        const alias = joinData.alias;
        const role = joinData.role as "찬성" | "반대";
        setMyAlias(alias);
        setMyRole(role);

        const dbPlayers: Player[] = roomData.players.map((p) => ({
          name: p.alias,
          role: p.role as "찬성" | "반대",
          ready: p.isReady ?? false,
          isMe: p.alias === alias,
        }));
        if (!dbPlayers.some((p) => p.name === alias)) {
          dbPlayers.push({ name: alias, role, ready: false, isMe: true });
        }
        setPlayers(dbPlayers);

        hub = buildHubConnection();
        hubRef.current = hub;

        hub.on("UserJoined", ({ alias: a }: { alias: string }) => {
          setPlayers((prev) => {
            if (prev.some((p) => p.name === a)) return prev;
            return [...prev, { name: a, role: "찬성", ready: false, isMe: a === alias }];
          });
        });

        hub.on("UserLeft", ({ alias: a }: { alias: string }) => {
          setPlayers((prev) => prev.filter((p) => p.name !== a));
        });

        hub.on("PlayerReadyUpdate", ({ alias: a }: { readyCount: number; alias: string }) => {
          setPlayers((prev) =>
            prev.map((p) => p.name === a ? { ...p, ready: true } : p)
          );
        });

        hub.on("GameStarted", ({ players: serverPlayers }: { players: SignalRPlayer[] }) => {
          setPlayers(
            serverPlayers.map((p) => ({
              name: p.alias,
              role: p.role as "찬성" | "반대",
              ready: true,
              isMe: p.alias === alias,
            }))
          );
          setPhase("reveal");
          setTimeout(() => {
            setPhase("debate");
            setTimer(180);
          }, 3500);
        });

        hub.on("PhaseChanged", ({ phase: newPhase }: { phase: string }) => {
          if (newPhase === "vote") {
            setPhase("vote");
            setTimer(30);
          } else if (newPhase === "result") {
            setPhase("result");
          }
        });

        hub.on("ReceiveMessage", (msg: { author: string; role: string; content: string; t: number }) => {
          setMsgs((prev) => [
            ...prev,
            { author: msg.author, role: msg.role as "찬성" | "반대", text: msg.content, t: msg.t },
          ]);
        });

        hub.on("VoteResult", (result: VoteResultPayload) => {
          setVoteResult(result);
          const unmaskPlayers = result.players.map((p) => ({
            name: p.alias,
            role: p.role as "찬성" | "반대",
            ready: true,
            isMe: p.alias === alias,
          }));
          setPlayers(unmaskPlayers);
          setPhase("result");
        });

        hub.on("ExtensionVoteUpdate", ({ votes, total }: { votes: number; total: number }) => {
          setExtensionVotes(votes);
          setExtensionTotal(total);
        });

        hub.on("TimeExtended", ({ extra }: { extra: number }) => {
          setTimer((t) => t + extra);
          setExtensionUsed(true);
          setExtensionVotes(0);
        });

        await hub.start();
        if (cancelled) { hub.stop(); return; }

        await hub.invoke("JoinRoom", parseInt(roomId), alias, role, uid);

        const wasReady = roomData.players.some(p => p.alias === alias && p.isReady);
        if (wasReady) {
          setMeReady(true);
          await hub.invoke("PlayerReady", parseInt(roomId));
        }
      } catch (e) {
        console.error("Failed to connect:", e);
      }
    })();

    return () => {
      cancelled = true;
      hub?.stop();
    };
  }, [roomId, nav]);

  // Countdown timer (display only — server drives actual phase transitions)
  useEffect(() => {
    if (phase !== "debate" && phase !== "vote") return;
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timer, phase]);

  // Auto-scroll messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const me = useMemo(() => players.find((p) => p.isMe), [players]);

  // 현재 유저의 연속 메시지 수 (다른 사람이 보내면 0으로 리셋)
  const consecutiveCount = useMemo(() => {
    if (!me) return 0;
    let count = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].author === me.name) count++;
      else break;
    }
    return count;
  }, [msgs, me]);

  const sendMsg = async () => {
    if (!draft.trim() || !hubRef.current || consecutiveCount >= 3 || sendingRef.current) return;
    sendingRef.current = true;
    try {
      await hubRef.current.invoke("SendMessage", parseInt(roomId), draft.trim());
      setDraft("");
    } catch {
      // 서버측 연속 제한 (동시성 엣지케이스)
    } finally {
      sendingRef.current = false;
    }
  };

  const handleExtension = async () => {
    if (extensionVoted || extensionUsed || !hubRef.current) return;
    setExtensionVoted(true);
    await hubRef.current.invoke("RequestExtension", parseInt(roomId));
  };

  const handleReady = async () => {
    if (!hubRef.current) return;
    setMeReady(true);
    setPlayers((prev) => prev.map((p) => (p.name === myAlias ? { ...p, ready: true, isMe: true } : p)));
    setReadyPulse(true);
    setTimeout(() => setReadyPulse(false), 600);
    await hubRef.current.invoke("PlayerReady", parseInt(roomId));
  };

  const handleVote = async (side: "찬성" | "반대") => {
    if (voted || !hubRef.current) return;
    setVoted(side);
    await hubRef.current.invoke("CastVote", parseInt(roomId), side);
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");
  const topic = room?.topic ?? "토론 주제 로딩 중…";

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
              방 #{roomId}
            </div>
            <div className="text-sm font-bold tracking-tight truncate">{topic}</div>
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
            topic={topic}
            ready={meReady}
            onReady={handleReady}
            pulse={readyPulse}
            minPlayers={room?.minPlayers ?? 2}
          />
        )}

        {(phase === "debate" || phase === "vote") && me && (
          <DebateView
            timer={`${mm}:${ss}`}
            timerSeconds={timer}
            players={players}
            msgs={msgs}
            draft={draft}
            setDraft={setDraft}
            sendMsg={sendMsg}
            me={me}
            scrollRef={scrollRef}
            voting={phase === "vote"}
            voted={voted}
            onVote={handleVote}
            topic={topic}
            consecutiveCount={consecutiveCount}
            extensionVoted={extensionVoted}
            extensionVotes={extensionVotes}
            extensionTotal={extensionTotal}
            extensionUsed={extensionUsed}
            onExtension={handleExtension}
          />
        )}

        {phase === "result" && (
          <ResultView
            players={players}
            topic={topic}
            voteResult={voteResult}
          />
        )}
      </div>

      {/* 입장 트리거 오버레이 */}
      {showEnter && phase === "waiting" && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="animate-fade-up text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
              입장 완료
            </div>
            <div className="text-2xl font-bold tracking-tight text-accent animate-pulse">
              {myAlias || "…"}
            </div>
          </div>
        </div>
      )}

      {/* 준비 완료 pulse ring */}
      {readyPulse && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 border-2 border-pro/60 animate-ping rounded-none" />
        </div>
      )}

      {/* Overlay: role reveal */}
      {phase === "reveal" && <RoleRevealOverlay role={myRole} topic={topic} />}
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
  pulse,
  minPlayers,
}: {
  players: Player[];
  topic: string;
  ready: boolean;
  onReady: () => void;
  pulse?: boolean;
  minPlayers: number;
}) {
  const readyPlayers = players.filter((p) => p.ready);

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 animate-fade-up">
      <aside className="bg-surface border border-border rounded-sm p-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          준비 완료 ({readyPlayers.length}/{minPlayers})
        </h3>
        <ul className="space-y-2">
          {readyPlayers.map((p) => (
            <li key={p.name} className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-pro" />
              <span className={`text-sm flex-1 ${p.isMe ? "font-bold text-accent" : ""}`}>
                {p.name} {p.isMe && "(나)"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-pro">준비</span>
            </li>
          ))}
        </ul>
        {readyPlayers.length === 0 && (
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 text-center py-4">
            아직 없음
          </div>
        )}
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
            준비 완료를 누르면 {minPlayers}명 이상 준비 시 자동으로 시작됩니다.
          </p>
        </div>

        <button
          type="button"
          disabled={ready}
          onClick={onReady}
          className={`mt-10 px-12 py-4 rounded-sm font-bold tracking-widest text-sm uppercase transition-all duration-200 ${
            ready
              ? "bg-pro/20 text-pro border border-pro/40 scale-95"
              : pulse
              ? "bg-accent text-background scale-95"
              : "bg-foreground text-background hover:bg-accent active:scale-95"
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
  const sub = role === "찬성" ? "이 주장을 옹호하세요" : "이 주장을 반박하세요";
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm grid place-items-center animate-fade-up">
      <div
        className={`relative max-w-md w-[90%] aspect-[3/4] border-2 rounded-lg ${color} bg-surface-elevated p-8 flex flex-col items-center justify-center text-center shadow-2xl`}
      >
        <div className="absolute top-4 left-4 right-4 flex justify-between font-mono text-[10px] uppercase tracking-widest opacity-60">
          <span>ROLE</span>
          <span>CARD</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
          ━ 당신의 역할 ━
        </div>
        <div className={`text-7xl font-bold tracking-tighter mb-6 ${color.split(" ")[0]}`}>{role}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{sub}</div>
        <p className="text-lg font-bold leading-snug text-foreground">"{topic}"</p>
        <div className="absolute bottom-4 left-4 right-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
          잠시 후 토론이 시작됩니다…
        </div>
      </div>
    </div>
  );
}

function DebateView({
  timer,
  timerSeconds,
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
  consecutiveCount,
  extensionVoted,
  extensionVotes,
  extensionTotal,
  extensionUsed,
  onExtension,
}: {
  timer: string;
  timerSeconds: number;
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
  consecutiveCount: number;
  extensionVoted: boolean;
  extensionVotes: number;
  extensionTotal: number;
  extensionUsed: boolean;
  onExtension: () => void;
}) {
  const blocked = consecutiveCount >= 3;
  const showExtension = !voting && timerSeconds > 0 && timerSeconds <= 30 && !extensionUsed;

  return (
    <div className="grid lg:grid-cols-[1fr_240px] gap-4 animate-fade-up">
      <div className="flex flex-col bg-surface border border-border rounded-sm overflow-hidden h-[calc(100vh-9rem)]">
        {/* Round bar */}
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">ROUND 1</div>
            <div className="text-sm font-bold tracking-tight">{voting ? "최종 투표" : "자유 토론"}</div>
          </div>
          <div className="flex items-center gap-3">
            {showExtension && (
              <button
                type="button"
                onClick={onExtension}
                disabled={extensionVoted}
                className={`px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  extensionVoted
                    ? "bg-accent/20 text-accent border border-accent/40 cursor-default"
                    : "border border-destructive/50 text-destructive hover:bg-destructive/10"
                }`}
              >
                {extensionVoted
                  ? `동의 ${extensionVotes}/${extensionTotal}`
                  : `+60초 연장 (${extensionVotes}/${extensionTotal})`}
              </button>
            )}
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">남은 시간</div>
              <div
                className={`font-mono text-2xl font-bold tracking-tight ${timerSeconds <= 30 && timerSeconds > 0 ? "text-destructive animate-pulse" : ""}`}
              >
                {timer}
              </div>
            </div>
          </div>
        </div>

        {/* AI host banner */}
        <div className="px-5 py-2.5 border-b border-border bg-accent/5 flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">사회자</span>
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
        <div className="border-t border-border bg-surface-elevated">
          {blocked && (
            <div className="px-4 py-2 font-mono text-[10px] text-destructive/80 tracking-wide">
              연속 3개 메시지를 보냈어요. 다른 참가자가 발언하면 다시 보낼 수 있어요.
            </div>
          )}
          <div className="p-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && !blocked && sendMsg()}
              placeholder={blocked ? "다른 참가자의 발언을 기다리는 중…" : `[${me.role}] 입장에서 발언하세요…`}
              disabled={blocked}
              className="flex-1 h-11 px-4 bg-background border border-border rounded-sm text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={sendMsg}
              disabled={blocked}
              className="h-11 px-6 bg-foreground text-background font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
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
              <span className={`size-2 rounded-full animate-pulse-dot ${p.role === "찬성" ? "bg-pro" : "bg-con"}`} />
              <span className={`text-xs flex-1 ${p.isMe ? "font-bold text-accent" : ""}`}>
                {p.name} {p.isMe && "(나)"}
              </span>
              <span className={`font-mono text-[9px] uppercase tracking-widest ${p.role === "찬성" ? "text-pro" : "text-con"}`}>
                {p.role}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Vote overlay */}
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
        <div className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">"{topic}"</div>
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

function ResultView({
  players,
  topic,
  voteResult,
}: {
  players: Player[];
  topic: string;
  voteResult: VoteResultPayload | null;
}) {
  const pro = voteResult?.pro ?? 0;
  const con = voteResult?.con ?? 0;
  const total = Math.max(pro + con, 1);
  const proPct = Math.round((pro / total) * 100);
  const conPct = 100 - proPct;
  const winner = voteResult?.winner ?? "집계 중";

  return (
    <div className="max-w-4xl mx-auto py-10 animate-fade-up">
      {/* Vote result */}
      <div className="bg-surface-elevated border border-border rounded-lg p-6 sm:p-8 mb-10 shadow-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 text-center">
          ━ 최종 투표 결과 ━
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-bold tracking-tight text-balance mb-1">
          "{topic}"
        </h2>
        <div className="text-center mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">승자 · </span>
          <span
            className={`font-bold tracking-tight ${
              winner === "찬성" ? "text-pro" : winner === "반대" ? "text-con" : "text-foreground"
            }`}
          >
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
            <div className={`text-3xl font-bold tracking-tighter ${p.role === "찬성" ? "text-pro" : "text-con"}`}>
              {p.role}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
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
