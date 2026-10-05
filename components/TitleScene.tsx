import type { GameMode } from "@/lib/gameTypes";
import styles from "@/app/page.module.css";

type Props = {
  notice: string;
  onStart: (mode: GameMode) => void;
};

export default function TitleScene({ notice, onStart }: Props) {
  return (
    <main className={styles.titleShell}>
      <section className={styles.titlePanel} aria-label="タイトル">
        <p className={styles.eyebrow}>Browser Reversi</p>
        <h1>REVERSI</h1>
        <div className={styles.titleActions}>
          <button type="button" onClick={() => onStart("pvp")}>
            2人対戦
          </button>
          <button type="button" onClick={() => onStart("cpu")}>
            CPU対戦
          </button>
          <button type="button" onClick={() => onStart("special")}>
            特殊オセロ
          </button>
        </div>
        <p className={styles.titleNotice}>{notice}</p>
      </section>
    </main>
  );
}
