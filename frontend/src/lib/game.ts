// Mock game data + tiny localStorage helpers (no backend yet)

export const RANDOM_NICKS = [
  "차분한고양이", "분노한토끼", "철학자감자", "행복한너구리",
  "냉정한여우", "수상한오리", "사색하는곰", "예리한늑대",
  "조용한참새", "엉뚱한판다", "용감한수달", "단호한사슴",
];

export const HOT_TOPICS = [
  { id: "fem", label: "페미니즘", heat: 98 },
  { id: "ai", label: "AI 규제", heat: 91 },
  { id: "wk4", label: "주4일제", heat: 87 },
  { id: "death", label: "사형제도", heat: 82 },
  { id: "ubi", label: "기본소득", heat: 74 },
  { id: "nuke", label: "원자력", heat: 69 },
];

export type Room = {
  id: string;
  topic: string;
  players: number;
  capacity: number;
  phase: "대기" | "토론" | "투표";
};

export const ROOMS: Room[] = [
  { id: "402", topic: "원자력은 인류의 미래다", players: 8, capacity: 10, phase: "대기" },
  { id: "318", topic: "기본소득은 사회 안전망이다", players: 10, capacity: 10, phase: "토론" },
  { id: "511", topic: "주4일제는 비현실적이다", players: 6, capacity: 10, phase: "대기" },
  { id: "271", topic: "AI는 강제 규제되어야 한다", players: 9, capacity: 10, phase: "토론" },
  { id: "189", topic: "사형제도는 폐지해야 한다", players: 4, capacity: 10, phase: "대기" },
  { id: "603", topic: "소셜 미디어는 순손실이다", players: 10, capacity: 10, phase: "투표" },
];

export const FLOATING_OPINIONS = [
  "기본소득은 필요하다",
  "원자력은 위험하다",
  "주4일제는 비현실적이다",
  "AI는 규제되어야 한다",
  "사형제도는 정의다",
  "프라이버시는 환상이다",
  "투표는 의무여야 한다",
  "소셜 미디어는 독이다",
  "성장보다 분배가 먼저다",
  "자유는 책임을 동반한다",
  "기술이 인간을 대체한다",
  "교육은 무료여야 한다",
];

const NICK_KEY = "alsoright:nick";
export function getNick(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NICK_KEY);
}
export function setNick(n: string) {
  if (typeof window !== "undefined") localStorage.setItem(NICK_KEY, n);
}

export function randomNick() {
  return RANDOM_NICKS[Math.floor(Math.random() * RANDOM_NICKS.length)];
}
