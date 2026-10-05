import type { CpuLevel, GameMode, SpecialActionType, SpEffect, SpSkill } from "@/lib/gameTypes";
import type { Board, Cell, Player } from "@/lib/othello";
import type { Position, SpecialState } from "@/lib/specialOthello";
import { isBlockedFor, isProtected } from "@/lib/specialOthello";
import styles from "@/app/page.module.css";

type Props = {
  board: Board;
  confirmTitleOpen: boolean;
  counts: Record<Player, number>;
  cpuLevel: CpuLevel;
  currentPlayer: Player;
  gameMode: GameMode;
  isCpuGame: boolean;
  lastMove: Position | null;
  message: string;
  onCancelSp: () => void;
  onCancelTitle: () => void;
  onCellClick: (row: number, col: number) => void;
  onConfirmTitle: () => void;
  onOpenTitleConfirm: () => void;
  onReset: () => void;
  onSelectCpuLevel: (level: CpuLevel) => void;
  onSelectSpEffect: (effect: SpEffect) => void;
  onSelectSpSkill: (skill: SpSkill) => void;
  onSetSpecialAction: (action: SpecialActionType) => void;
  onToggleOptions: (open: boolean) => void;
  optionsOpen: boolean;
  selectedSpSkill: SpSkill | null;
  specialAction: SpecialActionType;
  specialState: SpecialState | null;
  spEffectPending: boolean;
  spTargetKeys: Set<string>;
  thinking: boolean;
  validMoveKeys: Set<string>;
};

export default function GameScene({
  board,
  confirmTitleOpen,
  counts,
  cpuLevel,
  currentPlayer,
  gameMode,
  isCpuGame,
  lastMove,
  message,
  onCancelSp,
  onCancelTitle,
  onCellClick,
  onConfirmTitle,
  onOpenTitleConfirm,
  onReset,
  onSelectCpuLevel,
  onSelectSpEffect,
  onSelectSpSkill,
  onSetSpecialAction,
  onToggleOptions,
  optionsOpen,
  selectedSpSkill,
  specialAction,
  specialState,
  spEffectPending,
  spTargetKeys,
  thinking,
  validMoveKeys
}: Props) {
  const boardDisabled = thinking || optionsOpen;

  return (
    <main className={styles.shell}>
      <section className={styles.gameArea} aria-label="オセロゲーム">
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{modeLabel(gameMode)}</p>
            <h1>REVERSI</h1>
          </div>
          <button className={styles.resetButton} onClick={() => onToggleOptions(true)} type="button">
            OPTION
          </button>
        </div>

        <div className={styles.statusBar}>
          <div className={styles.scoreBox}>
            <span className={styles.blackDisc} />
            <strong>{counts.black}</strong>
            <span>黒</span>
          </div>
          <div className={styles.turnBox}>{thinking ? "CPU 思考中" : `${playerLabel(currentPlayer)}の番`}</div>
          <div className={styles.scoreBox}>
            <span className={styles.whiteDisc} />
            <strong>{counts.white}</strong>
            <span>{gameMode === "cpu" ? "CPU" : "白"}</span>
          </div>
        </div>

        <div className={styles.board} role="grid" aria-label="オセロ盤">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <BoardCell
                cell={cell}
                col={colIndex}
                disabled={boardDisabled}
                isBlocked={specialState ? isBlockedFor(specialState, currentPlayer, rowIndex, colIndex) : false}
                isLastMove={lastMove?.row === rowIndex && lastMove?.col === colIndex}
                isProtected={specialState ? isProtected(specialState, rowIndex, colIndex) : false}
                isValid={validMoveKeys.has(`${rowIndex}-${colIndex}`)}
                key={`${rowIndex}-${colIndex}`}
                onClick={() => onCellClick(rowIndex, colIndex)}
                row={rowIndex}
              />
            ))
          )}
        </div>
      </section>

      <aside className={styles.sidePanel}>
        <div className={styles.messagePanel}>
          <h2>状況</h2>
          <p>{message}</p>
        </div>

        {gameMode === "special" && specialState && (
          <SpecialPanel
            currentPlayer={currentPlayer}
            onCancelSp={onCancelSp}
            onSelectSpEffect={onSelectSpEffect}
            onSelectSpSkill={onSelectSpSkill}
            onSetSpecialAction={onSetSpecialAction}
            selectedSpSkill={selectedSpSkill}
            specialAction={specialAction}
            specialState={specialState}
            spEffectPending={spEffectPending}
            targetCount={spTargetKeys.size}
          />
        )}

        <div className={styles.messagePanel}>
          <h2>モード</h2>
          <p>
            {gameMode === "special"
              ? "通常着手でSPをため、SPECIALで相手石を変化させます。"
              : gameMode === "cpu"
              ? "あなたは黒、CPUは白です。"
              : "同じブラウザで黒と白を交互に操作します。"}
          </p>
        </div>
      </aside>

      {optionsOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} aria-label="オプション">
            {!confirmTitleOpen ? (
              <>
                <h2>OPTION</h2>
                <button type="button" onClick={() => onToggleOptions(false)}>
                  ゲームに戻る
                </button>
                <button type="button" onClick={onReset}>
                  最初から
                </button>
                {isCpuGame && (
                  <div className={styles.optionGroup}>
                    <span>CPU LEVEL</span>
                    <div className={styles.segmented}>
                      {(["easy", "normal", "hard"] as const).map((level) => (
                        <button
                          aria-pressed={cpuLevel === level}
                          key={level}
                          onClick={() => onSelectCpuLevel(level)}
                          type="button"
                        >
                          {level.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button type="button" onClick={onOpenTitleConfirm}>
                  タイトルへ戻る
                </button>
              </>
            ) : (
              <>
                <h2>タイトルへ戻りますか？</h2>
                <p>現在のゲームを終了してタイトルへ戻ります。</p>
                <button type="button" onClick={onCancelTitle}>
                  キャンセル
                </button>
                <button type="button" onClick={onConfirmTitle}>
                  タイトルへ
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function BoardCell({
  cell,
  col,
  disabled,
  isBlocked,
  isLastMove,
  isProtected,
  isValid,
  onClick,
  row
}: {
  cell: Cell;
  col: number;
  disabled: boolean;
  isBlocked: boolean;
  isLastMove: boolean;
  isProtected: boolean;
  isValid: boolean;
  onClick: () => void;
  row: number;
}) {
  const label = cell === "empty" ? "空き" : cell === "black" ? "黒" : "白";
  const isSpTarget = isValid && cell !== "empty";

  return (
    <button
      aria-label={`${row + 1}行${col + 1}列 ${label}`}
      className={`${styles.cell} ${isValid ? styles.validCell : ""} ${isBlocked ? styles.blockedCell : ""} ${
        isLastMove ? styles.lastMoveCell : ""
      }`}
      data-last-move={isLastMove ? "true" : undefined}
      disabled={disabled || (!isSpTarget && (cell !== "empty" || !isValid))}
      onClick={onClick}
      role="gridcell"
      type="button"
    >
      {cell !== "empty" && (
        <span
          className={`${styles.disc} ${cell === "black" ? styles.black : styles.white} ${isProtected ? styles.protectedDisc : ""}`}
        />
      )}
      {cell === "empty" && isValid && <span className={styles.hint} />}
      {isSpTarget && <span className={styles.spTargetHint} />}
      {isLastMove && <span aria-hidden="true" className={styles.lastMoveBadge} />}
    </button>
  );
}

function SpecialPanel({
  currentPlayer,
  onCancelSp,
  onSelectSpEffect,
  onSelectSpSkill,
  onSetSpecialAction,
  selectedSpSkill,
  specialAction,
  specialState,
  spEffectPending,
  targetCount
}: {
  currentPlayer: Player;
  onCancelSp: () => void;
  onSelectSpEffect: (effect: SpEffect) => void;
  onSelectSpSkill: (skill: SpSkill) => void;
  onSetSpecialAction: (action: SpecialActionType) => void;
  selectedSpSkill: SpSkill | null;
  specialAction: SpecialActionType;
  specialState: SpecialState;
  spEffectPending: boolean;
  targetCount: number;
}) {
  const currentSp = currentPlayer === "black" ? specialState.blackSp : specialState.whiteSp;

  return (
    <div className={styles.messagePanel}>
      <h2>SPECIAL</h2>
      <div className={styles.spBars}>
        <SpBar label="BLACK SP" value={specialState.blackSp} />
        <SpBar label="WHITE SP" value={specialState.whiteSp} />
      </div>

      {!spEffectPending ? (
        <>
          <div className={styles.segmented}>
            <button
              aria-pressed={specialAction === "normal"}
              onClick={() => onSetSpecialAction("normal")}
              type="button"
            >
              NORMAL
            </button>
            <button
              aria-pressed={specialAction === "sp"}
              onClick={() => onSetSpecialAction("sp")}
              type="button"
            >
              SPECIAL
            </button>
          </div>

          {specialAction === "sp" && (
            <div className={styles.spSkillGrid}>
              {([5, 10, 20] as const).map((skill) => (
                <button
                  aria-pressed={selectedSpSkill === skill}
                  disabled={currentSp < skill || targetCount === 0}
                  key={skill}
                  onClick={() => onSelectSpSkill(skill)}
                  type="button"
                >
                  {skill} SP
                </button>
              ))}
              <button type="button" onClick={onCancelSp}>
                キャンセル
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.spSkillGrid}>
          <button type="button" onClick={() => onSelectSpEffect("defense")}>
            防衛
          </button>
          <button disabled={targetCount === 0} type="button" onClick={() => onSelectSpEffect("combo")}>
            連撃
          </button>
        </div>
      )}
    </div>
  );
}

function SpBar({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.spBar}>
      <span>
        {label} {value} / 20
      </span>
      <div>
        <i style={{ width: `${(value / 20) * 100}%` }} />
      </div>
    </div>
  );
}

function modeLabel(mode: GameMode) {
  if (mode === "pvp") return "2人対戦";
  if (mode === "special") return "特殊オセロ";
  return "CPU対戦";
}

function playerLabel(player: Player) {
  return player === "black" ? "黒" : "白";
}
