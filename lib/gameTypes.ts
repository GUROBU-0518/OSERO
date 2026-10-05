import type { Player } from "@/lib/othello";

export type Scene = "title" | "specialMenu" | "tutorial" | "game" | "result";
export type GameMode = "pvp" | "cpu" | "special";
export type CpuLevel = "easy" | "normal" | "hard";
export type SpecialActionType = "normal" | "sp";
export type SpSkill = 5 | 10 | 20;
export type SpEffect = "defense" | "combo";
export type GameResult = {
  blackCount: number;
  whiteCount: number;
  winner: Player | "draw";
};
