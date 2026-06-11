import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchRooms,
  fetchTopics,
  createRoom,
  type RoomSummary,
  type TopicItem,
} from "@/lib/api";
import { buildLobbyConnection } from "@/lib/signalr";

export const Route = createFileRoute("/lobby")({
  head: () => ({ meta: [{ title: "로비 — 니맞내맞" }] }),
  component: Lobby,
});

function Lobby() {
  const nav = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [activeGames, setActiveGames] = useState(0);
  const [todayRooms, setTodayRooms] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newTags, setNewTags] = useState("");
  const [minPlayers, setMinPlayers] = useState(2);
  const [creating, setCreating] = useState(false);

  // 인기 주제는 REST로 한 번만 로드
  useEffect(() => {
    fetchTopics().then(setTopics).catch(() => {});
  }, []);

  // 실시간: LobbyHub 연결
  useEffect(() => {
    // 초기 방 목록 로드
    fetchRooms().then(setRooms).catch(() => {});

    const hub = buildLobbyConnection();

    hub.on("StatsUpdated", ({ activeGames: ag, todayRooms: tr }: { activeGames: number; todayRooms: number }) => {
      setActiveGames(ag);
      setTodayRooms(tr);
    });

    hub.on("RoomsUpdated", (updated: RoomSummary[]) => {
      setRooms(updated);
    });

    hub.start().catch(() => {});

    return () => { hub.stop(); };
  }, []);

  const handleCreateRoom = async () => {
    if (!newTopic.trim()) return;
    setCreating(true);
    try {
      const room = await createRoom(newTopic.trim(), `${newTopic.trim()} 토론방`, newTags.trim(), 10, minPlayers);
      setShowCreate(false);
      setNewTopic("");
      setNewTags("");
      setMinPlayers(2);
      nav({ to: "/room/$roomId", params: { roomId: room.id } });
    } catch {
      setCreating(false);
    }
  };

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
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[220px_1fr_240px] gap-6">
        {/* LEFT: hot topics */}
        <aside className="space-y-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            🔥 인기 주제
          </h3>
          <div className="space-y-2">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => { setNewTags("#" + t.label); setShowCreate(true); }}
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
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-foreground text-background rounded-sm font-bold text-xs tracking-widest uppercase hover:bg-accent transition-colors"
            >
              + 방 만들기
            </button>
          </div>

          {/* Create room form */}
          {showCreate && (
            <div className="bg-surface-elevated border border-accent/30 rounded-sm p-4 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-accent">새 토론방</div>
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="토론 주제를 입력하세요…"
                className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
                autoFocus
              />
              <input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="#태그1 #태그2 (선택)"
                className="w-full h-10 px-3 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent font-mono"
              />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
                  자동 시작 인원
                </span>
                <div className="flex gap-1.5">
                  {[2, 3, 4, 6, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMinPlayers(n)}
                      className={`w-8 h-8 rounded-sm font-mono text-xs font-bold transition-colors ${
                        minPlayers === n
                          ? "bg-accent text-background"
                          : "border border-border text-muted-foreground hover:border-accent hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateRoom}
                  disabled={creating}
                  className="px-4 py-2 bg-foreground text-background rounded-sm font-bold text-xs tracking-widest uppercase hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {creating ? "생성 중…" : "만들기"}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewTopic(""); }}
                  className="px-4 py-2 border border-border rounded-sm font-bold text-xs tracking-widest uppercase hover:border-foreground transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {rooms.map((r) => {
              const inProgress = r.phase === "토론" || r.phase === "투표";
              const closed = r.phase === "종료";
              const blocked = inProgress || closed;
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
                                : r.phase === "종료"
                                  ? "bg-muted/30 text-muted-foreground"
                                  : "bg-con/15 text-con"
                          }`}
                        >
                          {r.phase}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold tracking-tight group-hover:text-accent transition-colors">
                        {r.topic}
                      </h3>
                      {r.tags && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {r.tags.split(" ").map((tag) => (
                            <span key={tag} className="font-mono text-[10px] text-accent/70 tracking-wide">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.players > 0 && (
                        <div className="mt-3 font-mono text-[10px] text-muted-foreground">
                          준비 완료 {r.players}명
                        </div>
                      )}
                    </div>
                    {blocked ? (
                      <span className="shrink-0 px-5 py-2.5 rounded-sm font-bold text-xs tracking-widest uppercase border border-border text-muted-foreground cursor-not-allowed">
                        {closed ? "종료" : "진행중"}
                      </span>
                    ) : (
                      <Link
                        to="/room/$roomId"
                        params={{ roomId: r.id }}
                        className="shrink-0 px-5 py-2.5 rounded-sm font-bold text-xs tracking-widest uppercase transition-colors bg-foreground text-background hover:bg-accent"
                      >
                        입장
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {rooms.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-16 font-mono uppercase tracking-widest text-[10px]">
                ━ 아직 방이 없습니다 · 첫 방을 만들어보세요 ━
              </div>
            )}
          </div>
        </main>

        {/* RIGHT: live stats */}
        <aside className="space-y-4">
          <div className="bg-surface border border-border rounded-sm p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              진행중 게임
            </div>
            <div className="text-3xl font-bold tracking-tighter text-accent">{activeGames}</div>
          </div>
          <div className="bg-surface border border-border rounded-sm p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              오늘 토론
            </div>
            <div className="text-3xl font-bold tracking-tighter">{todayRooms}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
