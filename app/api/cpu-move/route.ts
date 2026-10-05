import { NextResponse } from "next/server";
import {
  Board,
  CpuLevel,
  Player,
  applyMove,
  chooseCpuMove,
  getWinner,
  hasAnyValidMove,
  otherPlayer
} from "@/lib/othello";

export async function POST(request: Request) {
  const body = (await request.json()) as { board?: Board; level?: CpuLevel; player?: Player };

  if (!isBoard(body.board) || !isPlayer(body.player) || !isCpuLevel(body.level ?? "normal")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const board = body.board;
  const player = body.player;
  const level = body.level ?? "normal";
  const opponent = otherPlayer(player);
  const move = chooseCpuMove(board, player, level);

  if (!move) {
    return NextResponse.json({
      move: null,
      board,
      nextPlayer: opponent,
      message: "CPU は置ける場所がないためパスしました。"
    });
  }

  const nextBoard = applyMove(board, player, move.row, move.col);

  if (!nextBoard) {
    return NextResponse.json({ error: "Illegal CPU move" }, { status: 500 });
  }

  const cpuCanMoveAgain = hasAnyValidMove(nextBoard, player);
  const humanCanMove = hasAnyValidMove(nextBoard, opponent);
  const isGameOver = !cpuCanMoveAgain && !humanCanMove;
  const nextPlayer = humanCanMove ? opponent : player;

  return NextResponse.json({
    move: { row: move.row, col: move.col },
    board: nextBoard,
    nextPlayer,
    message: isGameOver
      ? `ゲーム終了です。勝者: ${winnerLabel(getWinner(nextBoard))}`
      : humanCanMove
        ? "あなたの番です。"
        : "あなたは置ける場所がないためパスです。CPU が続けます。"
  });
}

function isBoard(value: unknown): value is Board {
  return (
    Array.isArray(value) &&
    value.length === 8 &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 8 &&
        row.every((cell) => cell === "black" || cell === "white" || cell === "empty")
    )
  );
}

function isPlayer(value: unknown): value is Player {
  return value === "black" || value === "white";
}

function isCpuLevel(value: unknown): value is CpuLevel {
  return value === "easy" || value === "normal" || value === "hard";
}

function winnerLabel(winner: Player | "draw") {
  if (winner === "draw") return "引き分け";
  return winner === "black" ? "黒" : "白";
}
