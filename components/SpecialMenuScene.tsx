import styles from "@/app/page.module.css";

type Props = {
  onPlayCpu: () => void;
  onPlayPvp: () => void;
  onTitle: () => void;
  onTutorial: () => void;
};

export default function SpecialMenuScene({ onPlayCpu, onPlayPvp, onTitle, onTutorial }: Props) {
  return (
    <main className={styles.titleShell}>
      <section className={styles.titlePanel} aria-label="特殊オセロメニュー">
        <p className={styles.eyebrow}>Special Rules</p>
        <h1>SPECIAL OTHELLO</h1>
        <div className={styles.titleActions}>
          <button type="button" onClick={onTutorial}>
            チュートリアル
          </button>
          <button type="button" onClick={onPlayPvp}>
            2人でプレイ
          </button>
          <button type="button" onClick={onPlayCpu}>
            CPU対戦
          </button>
          <button type="button" onClick={onTitle}>
            タイトルへ戻る
          </button>
        </div>
      </section>
    </main>
  );
}
