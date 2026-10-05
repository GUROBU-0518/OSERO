import type { GameMode, GameResult } from "@/lib/gameTypes";
import styles from "@/app/page.module.css";

type Props = {
  gameMode: GameMode;
  onRetry: () => void;
  onTitle: () => void;
  result: GameResult;
};

export default function ResultScene({ gameMode, onRetry, onTitle, result }: Props) {
  return (
    <main className={styles.resultShell}>
      <section className={styles.resultPanel} aria-label="リザルト">
        <p className={styles.eyebrow}>{modeLabel(gameMode)}</p>
        <h1>RESULT</h1>
        <div className={styles.resultScores}>
          <div>
            <span>BLACK</span>
            <strong>{result.blackCount}</strong>
          </div>
          <div>
            <span>WHITE</span>
            <strong>{result.whiteCount}</strong>
          </div>
        </div>
        <p className={styles.resultWinner}>{winnerText(result.winner)}</p>
        <div className={styles.titleActions}>
          <button type="button" onClick={onRetry}>
            もう一度
          </button>
          <button type="button" onClick={onTitle}>
            タイトルへ
          </button>
        </div>
      </section>
    </main>
  );
}

function winnerText(winner: GameResult["winner"]) {
  if (winner === "draw") return "DRAW";
  return winner === "black" ? "BLACK WIN!" : "WHITE WIN!";
}

function modeLabel(gameMode: GameMode) {
  if (gameMode === "cpu") return "CPU対戦";
  if (gameMode === "special") return "SPECIAL OTHELLO";
  return "2人対戦";
}
