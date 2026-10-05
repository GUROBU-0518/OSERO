"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";

type Props = {
  onBack: () => void;
  onPlay: () => void;
};

const tutorialStorageKey = "specialOthelloTutorialComplete";

type TutorialCell = "empty" | "black" | "white" | "place" | "block" | "protect" | "target" | "combo";

type TutorialStep = {
  body: string;
  board: TutorialCell[][];
  phase: "反転数ボーナス" | "SP効果";
  points: string[];
  title: string;
  type: "normal" | "sp" | "effect";
};

const emptyRow: TutorialCell[] = ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"];

const tutorialSteps: TutorialStep[] = [
  {
    phase: "反転数ボーナス",
    title: "まずは通常着手",
    body: "黒が白をはさめる場所へ置くと、通常のオセロと同じように白石が黒石へ反転します。",
    board: [
      emptyRow,
      emptyRow,
      ["empty", "empty", "empty", "place", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "white", "black", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "black", "white", "empty", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["光っているマスが置ける場所です。", "置くと、はさんだ白石が黒石になります。", "通常着手でゲームが進みます。"]
    ,
    type: "normal"
  },
  {
    phase: "反転数ボーナス",
    title: "反転数でSPが増える",
    body: "通常着手で反転した枚数ぶんSPが増えます。多く返すほど、あとで強いSP技を使いやすくなります。",
    board: [
      emptyRow,
      emptyRow,
      ["empty", "empty", "black", "white", "white", "place", "empty", "empty"],
      emptyRow,
      ["empty", "empty", "empty", "black", "empty", "empty", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["1枚反転で1SP増えます。", "SPは最大20までたまります。", "SP技ではSPは増えません。"]
    ,
    type: "normal"
  },
  {
    phase: "反転数ボーナス",
    title: "3から4枚反転: 封鎖",
    body: "3から4枚を一度に反転すると、相手の次の合法手を1マス封鎖できます。",
    board: [
      emptyRow,
      ["empty", "empty", "empty", "block", "empty", "empty", "empty", "empty"],
      ["empty", "black", "white", "white", "white", "place", "empty", "empty"],
      emptyRow,
      ["empty", "empty", "empty", "black", "empty", "empty", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["封鎖マスは相手が次のターンだけ置けません。", "少ない反転でも相手の手を狭められます。", "封鎖候補が少ない場合は発生しないことがあります。"]
    ,
    type: "normal"
  },
  {
    phase: "反転数ボーナス",
    title: "5枚反転: 周囲封鎖",
    body: "5枚反転すると、置いた石の周囲が相手の次ターンだけ封鎖されます。",
    board: [
      emptyRow,
      emptyRow,
      ["empty", "empty", "block", "block", "block", "empty", "empty", "empty"],
      ["empty", "empty", "block", "place", "block", "empty", "empty", "empty"],
      ["empty", "empty", "block", "block", "block", "empty", "empty", "empty"],
      ["empty", "black", "white", "white", "white", "white", "white", "black"],
      emptyRow,
      emptyRow
    ],
    points: ["置いた石の周囲がまとめて封鎖されます。", "相手の切り返しを強く妨害できます。", "封鎖は永続ではありません。"]
    ,
    type: "normal"
  },
  {
    phase: "反転数ボーナス",
    title: "6枚以上反転: 保護",
    body: "6枚以上反転すると、反転した石が相手の次ターンだけ保護されます。",
    board: [
      emptyRow,
      emptyRow,
      ["empty", "protect", "protect", "place", "protect", "protect", "protect", "empty"],
      ["empty", "black", "black", "black", "black", "black", "black", "empty"],
      emptyRow,
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["保護された石は次の相手ターンで返されません。", "大量反転した成果を守れます。", "保護も次の相手ターンだけです。"]
    ,
    type: "effect"
  },
  {
    phase: "反転数ボーナス",
    title: "18枚以上反転: 盤面制圧",
    body: "18枚以上を一度に反転すると、盤上の石をすべて自分色へ変えます。",
    board: [
      ["black", "black", "black", "place", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"],
      ["black", "black", "black", "black", "black", "black", "black", "black"]
    ],
    points: ["発生すれば一気に盤面を支配できます。", "狙える場面は多くありません。", "大量反転のごほうび効果です。"]
    ,
    type: "effect"
  },
  {
    phase: "SP効果",
    title: "SP技の基本",
    body: "SP技は空きマスへ置く技ではありません。角以外の相手石を選び、自分色へ直接変化させます。",
    board: [
      ["black", "empty", "empty", "empty", "empty", "empty", "empty", "white"],
      ["empty", "empty", "empty", "empty", "empty", "target", "empty", "empty"],
      ["empty", "empty", "black", "empty", "white", "empty", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow,
      emptyRow,
      ["white", "empty", "empty", "empty", "empty", "empty", "empty", "black"]
    ],
    points: ["対象は角以外の相手石です。", "SPを消費して発動します。", "SP技による反転ではSPは増えません。"]
    ,
    type: "sp"
  },
  {
    phase: "SP効果",
    title: "5SP / 10SP技",
    body: "5SPや10SPでは、選んだ相手石を自分色へ変化させ、そこから通常の反転判定も行います。",
    board: [
      emptyRow,
      emptyRow,
      ["empty", "empty", "black", "white", "target", "white", "empty", "empty"],
      ["empty", "empty", "empty", "black", "empty", "empty", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["相手の大事な石を直接崩せます。", "角は対象外です。", "10SPはより強いタイミングで使いやすい技です。"]
    ,
    type: "sp"
  },
  {
    phase: "SP効果",
    title: "20SP防衛",
    body: "20SP防衛は、変化させた石から発生した反転石を保護し、起点の周囲を封鎖します。",
    board: [
      emptyRow,
      emptyRow,
      ["empty", "empty", "block", "block", "block", "empty", "empty", "empty"],
      ["empty", "empty", "block", "target", "block", "empty", "empty", "empty"],
      ["empty", "empty", "block", "protect", "block", "empty", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["守りを固めたい場面で使います。", "保護と封鎖が同時に発生します。", "相手の反撃をかなり弱められます。"]
    ,
    type: "sp"
  },
  {
    phase: "SP効果",
    title: "20SP連撃",
    body: "20SP連撃は、1つ目の相手石を変化させたあと、もう1つ相手石を追加で変化させます。",
    board: [
      emptyRow,
      ["empty", "empty", "target", "empty", "empty", "combo", "empty", "empty"],
      ["empty", "empty", "black", "white", "white", "black", "empty", "empty"],
      emptyRow,
      emptyRow,
      emptyRow,
      emptyRow,
      emptyRow
    ],
    points: ["攻めを広げたい場面で使います。", "2個目の相手石も自分色へ変えられます。", "盤面を一気にひっくり返す起点になります。"]
    ,
    type: "sp"
  }
];

export default function TutorialScene({ onBack, onPlay }: Props) {
  const [playedSteps, setPlayedSteps] = useState<Set<number>>(() => new Set());
  const [stepIndex, setStepIndex] = useState(0);
  const step = tutorialSteps[stepIndex];
  const isLastStep = stepIndex === tutorialSteps.length - 1;
  const hasPlayed = playedSteps.has(stepIndex);
  const displayBoard = useMemo(
    () => (hasPlayed ? resolvePlayedBoard(step) : step.board),
    [hasPlayed, step]
  );
  const progressText = useMemo(() => `${stepIndex + 1} / ${tutorialSteps.length}`, [stepIndex]);

  useEffect(() => {
    if (isLastStep && hasPlayed) {
      window.localStorage.setItem(tutorialStorageKey, "true");
    }
  }, [hasPlayed, isLastStep]);

  const goPrevious = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    setStepIndex((current) => Math.min(tutorialSteps.length - 1, current + 1));
  };

  const resetTutorialProgress = () => {
    window.localStorage.removeItem(tutorialStorageKey);
    setPlayedSteps(new Set());
    setStepIndex(0);
  };

  const playCurrentStep = () => {
    setPlayedSteps((current) => {
      const next = new Set(current);
      next.add(stepIndex);
      return next;
    });
  };

  return (
    <main className={styles.titleShell}>
      <section className={styles.tutorialPanel} aria-label="特殊オセロチュートリアル">
        <p className={styles.eyebrow}>Tutorial</p>
        <h1>SPECIAL GUIDE</h1>
        <div className={styles.tutorialCard}>
          <div className={styles.tutorialProgress} aria-label={`進行 ${progressText}`}>
            {tutorialSteps.map((item, index) => (
              <span aria-current={index === stepIndex ? "step" : undefined} key={`${item.phase}-${item.title}`} />
            ))}
          </div>
          <p className={styles.tutorialCount}>
            {step.phase} {progressText}
          </p>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
          <p className={hasPlayed ? styles.tutorialSuccess : styles.tutorialPrompt}>
            {hasPlayed ? "成功です。盤面の変化を確認して、次へ進んでください。" : "光っているマスを押して、この手順を実行してください。"}
          </p>
          <div className={styles.tutorialBoard} aria-label="チュートリアル盤面">
            {displayBoard.flatMap((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  className={styles.tutorialBoardCell}
                  data-cell={cell}
                  disabled={hasPlayed || !isActionCell(cell)}
                  key={`${rowIndex}-${colIndex}`}
                  onClick={playCurrentStep}
                  type="button"
                >
                  {(cell === "black" || cell === "white") && <span className={styles.tutorialDisc} data-disc={cell} />}
                  {cell === "place" && <span className={styles.tutorialHint}>置</span>}
                  {cell === "block" && <span className={styles.tutorialHint}>封</span>}
                  {cell === "protect" && <span className={styles.tutorialHint}>守</span>}
                  {cell === "target" && <span className={styles.tutorialHint}>的</span>}
                  {cell === "combo" && <span className={styles.tutorialHint}>連</span>}
                </button>
              ))
            )}
          </div>
          <ul>
            {step.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className={styles.tutorialNav}>
            <button type="button" onClick={goPrevious} disabled={stepIndex === 0}>
              前へ
            </button>
            <button type="button" onClick={goNext} disabled={isLastStep || !hasPlayed}>
              次へ
            </button>
          </div>
        </div>
        <div className={styles.titleActions}>
          {isLastStep && (
            <p className={styles.tutorialSuccess}>
              チュートリアル完了です。特殊オセロ本編へ進めます。
            </p>
          )}
          <button type="button" onClick={onPlay}>
            {isLastStep && hasPlayed ? "特殊オセロを始める" : "2人でプレイ"}
          </button>
          {isLastStep && hasPlayed && (
            <button type="button" onClick={resetTutorialProgress}>
              チュートリアルをリセット
            </button>
          )}
          <button type="button" onClick={onBack}>
            メニューへ戻る
          </button>
        </div>
      </section>
    </main>
  );
}

function isActionCell(cell: TutorialCell): boolean {
  return cell === "place" || cell === "target" || cell === "combo";
}

function resolvePlayedBoard(step: TutorialStep): TutorialCell[][] {
  return step.board.map((row) =>
    row.map((cell) => {
      if (cell === "place" || cell === "target" || cell === "combo") return "black";
      if (step.type === "normal" && cell === "white") return "black";
      return cell;
    })
  );
}
