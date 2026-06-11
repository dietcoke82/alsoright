const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5185";

export type RoomSummary = {
  id: string;
  topic: string;
  tags: string;
  phase: "대기" | "토론" | "투표" | "종료";
  players: number;
  capacity: number;
};

export type TopicItem = {
  id: string;
  label: string;
  heat: number;
};

export type RoomDetail = {
  id: string;
  topic: string;
  phase: string;
  capacity: number;
  minPlayers: number;
  players: PlayerInfo[];
  messages: MessageInfo[];
};

export type PlayerInfo = {
  id: number;
  alias: string;
  role: "찬성" | "반대";
  isAlive: boolean;
  isReady: boolean;
};

export type MessageInfo = {
  id: number;
  nickname: string;
  content: string;
  role: "찬성" | "반대";
  createdAt: string;
};

export type RecentDebate = {
  topic: string;
  pro: number;
  con: number;
  winner: string;
};

export type StatsInfo = {
  activeGames: number;
  todayRooms: number;
  recentDebate: RecentDebate | null;
};

export type JoinResponse = {
  alias: string;
  role: string;
};

export async function fetchRooms(): Promise<RoomSummary[]> {
  const res = await fetch(`${BASE}/api/rooms`);
  if (!res.ok) throw new Error("Failed to fetch rooms");
  return res.json();
}

export async function fetchRoom(id: string): Promise<RoomDetail> {
  const res = await fetch(`${BASE}/api/rooms/${id}`);
  if (!res.ok) throw new Error("Room not found");
  return res.json();
}

export async function fetchTopics(): Promise<TopicItem[]> {
  const res = await fetch(`${BASE}/api/topics`);
  if (!res.ok) throw new Error("Failed to fetch topics");
  return res.json();
}

export async function fetchStats(): Promise<StatsInfo> {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function createRoom(topic: string, title: string, tags = "", maxPlayers = 10, minPlayers = 2): Promise<RoomSummary> {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, topic, tags, maxPlayers, minPlayers }),
  });
  if (!res.ok) throw new Error("Failed to create room");
  return res.json();
}

export function getOrCreateUid(): string {
  let uid = localStorage.getItem("alsoright_uid");
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem("alsoright_uid", uid);
  }
  return uid;
}

export async function joinRoom(roomId: string, uid?: string): Promise<JoinResponse> {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: uid ?? null }),
  });
  if (!res.ok) throw new Error("Failed to join room");
  return res.json();
}
