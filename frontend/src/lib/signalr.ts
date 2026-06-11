import * as signalR from "@microsoft/signalr";
import { getSessionId } from "@/lib/game";

export type SignalRPlayer = { alias: string; role: "찬성" | "반대" };

export type GameStartedPayload = { players: SignalRPlayer[] };
export type ReceiveMessagePayload = {
  author: string;
  role: "찬성" | "반대";
  content: string;
  t: number;
};
export type VoteResultPayload = {
  pro: number;
  con: number;
  winner: string;
  players: SignalRPlayer[];
};
export type PhaseChangedPayload = { phase: string };

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5185";

export function buildHubConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${BASE}/gamehub?uid=${getSessionId()}`)
    .withAutomaticReconnect()
    .build();
}

export function buildLobbyConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${BASE}/lobbyhub?uid=${getSessionId()}`)
    .withAutomaticReconnect()
    .build();
}
