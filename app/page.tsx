"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import {
  Board,
  Cell,
  Player,
  applyMove,
  createInitialBoard,
  countPieces,
  findValidMoves,
  getWinner,
  hasAnyValidMove,
} from "@/lib/othello";

type CpuResponse = {
  move: { row: number; col: number } | null;
  board: Board;
  nextPlayer: Player;
  message: string;
};

const human: Player = "black";
const cpu: Player = "white";

export default function Home() {
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(human);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("黒のあなたから開始です。置ける場所が光ります。");

  const counts = useMemo(() => countPieces(board), [board]);
  const humanMoves = useMemo(() => findValidMoves(board, human), [board]);
  const gameOver = !hasAnyValidMove(board, human) && !hasAnyValidMove(board, cpu);
  const winner = gameOver ? getWinner(board) : null;

  const validMoveKeys = useMemo(
    () => new Set(humanMoves.map((move) => `${move.row}-${move.col}`)),
    [humanMoves]
  );

  async function askCpu(nextBoard: Board) {
    setThinking(true);
    setMessage("CPU が考えています...");

    try {
      let boardAfterCpu = nextBoard;
      let cpuMessage = "";
      let nextTurn: Player = human;

      do {
        const response = await fetch("/api/cpu-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board: boardAfterCpu, player: cpu })
        });

        if (!response.ok) {
          throw new Error("CPU move failed");
        }

        const data = (await response.json()) as CpuResponse;
        boardAfterCpu = data.board;
        cpuMessage = data.message;
        nextTurn = data.nextPlayer;
      } while (
        nextTurn === cpu &&
        hasAnyValidMove(boardAfterCpu, cpu) &&
        !hasAnyValidMove(boardAfterCpu, human)
      );

      setBoard(boardAfterCpu);
      setCurrentPlayer(nextTurn);
      setMessage(cpuMessage);
    } catch {
      setCurrentPlayer(human);
      setMessage("CPU の処理に失敗しました。もう一度置いてみてください。");
    } finally {
      setThinking(false);
    }
  }

  async function handleCellClick(row: number, col: number) {
    if (thinking || gameOver || currentPlayer !== human) return;
    if (!validMoveKeys.has(`${row}-${col}`)) return;

    const afterHumanMove = applyMove(board, human, row, col);

    if (!afterHumanMove) return;

    setBoard(afterHumanMove);

    if (!hasAnyValidMove(afterHumanMove, cpu)) {
      if (!hasAnyValidMove(afterHumanMove, human)) {
        setCurrentPlayer(human);
        setMessage("ゲーム終了です。");
      } else {
        setCurrentPlayer(human);
        setMessage("CPU は置ける場所がないためパスしました。続けてあなたの番です。");
      }
      return;
    }

    setCurrentPlayer(cpu);
    await askCpu(afterHumanMove);
  }

  function resetGame() {
    setBoard(createInitialBoard());
    setCurrentPlayer(human);
    setThinking(false);
    setMessage("黒のあなたから開始です。置ける場所が光ります。");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.gameArea} aria-label="オセロゲーム">
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Browser Othello</p>
            <h1>Othello VS CPU</h1>
          </div>
          <button className={styles.resetButton} onClick={resetGame} type="button">
            リセット
          </button>
        </div>

        <div className={styles.statusBar}>
          <div className={styles.scoreBox}>
            <span className={styles.blackDisc} />
            <strong>{counts.black}</strong>
            <span>あなた</span>
          </div>
          <div className={styles.turnBox}>
            {gameOver ? "終了" : currentPlayer === human ? "あなたの番" : "CPU の番"}
          </div>
          <div className={styles.scoreBox}>
            <span className={styles.whiteDisc} />
            <strong>{counts.white}</strong>
            <span>CPU</span>
          </div>
        </div>

        <div className={styles.board} role="grid" aria-label="オセロ盤">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <BoardCell
                cell={cell}
                col={colIndex}
                disabled={thinking || gameOver || currentPlayer !== human}
                isValid={validMoveKeys.has(`${rowIndex}-${colIndex}`)}
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                row={rowIndex}
              />
            ))
          )}
        </div>
      </section>

      <aside className={styles.sidePanel}>
        <div className={styles.messagePanel}>
          <h2>状況</h2>
          <p>{gameOver ? renderResult(winner) : message}</p>
        </div>

        <div className={styles.messagePanel}>
          <h2>CPU</h2>
          <p>
            CPU は角、辺、反転数を評価して手を選びます。完全最強ではありませんが、
            序盤から自然に対戦できます。
          </p>
        </div>
      </aside>
    </main>
  );
}

function BoardCell({
  cell,
  col,
  disabled,
  isValid,
  onClick,
  row
}: {
  cell: Cell;
  col: number;
  disabled: boolean;
  isValid: boolean;
  onClick: () => void;
  row: number;
}) {
  const label = cell === "empty" ? "空き" : cell === "black" ? "黒" : "白";

  return (
    <button
      aria-label={`${row + 1}行${col + 1}列 ${label}`}
      className={`${styles.cell} ${isValid ? styles.validCell : ""}`}
      disabled={disabled && cell === "empty"}
      onClick={onClick}
      role="gridcell"
      type="button"
    >
      {cell !== "empty" && (
        <span
          className={`${styles.disc} ${cell === "black" ? styles.black : styles.white}`}
        />
      )}
      {cell === "empty" && isValid && <span className={styles.hint} />}
    </button>
  );
}

function renderResult(winner: Player | "draw" | null) {
  if (!winner) return "ゲーム終了です。";
  if (winner === "draw") return "引き分けです。いい勝負でした。";
  if (winner === human) return "あなたの勝ちです。お見事です。";
  return "CPU の勝ちです。リセットして再挑戦できます。";
}
