"use client";

import { useMemo, useRef, useState } from "react";
import GameScene from "@/components/GameScene";
import ResultScene from "@/components/ResultScene";
import SpecialMenuScene from "@/components/SpecialMenuScene";
import TitleScene from "@/components/TitleScene";
import TutorialScene from "@/components/TutorialScene";
import type {
  CpuLevel,
  GameMode,
  GameResult,
  Scene,
  SpecialActionType,
  SpEffect,
  SpSkill
} from "@/lib/gameTypes";
import {
  Board,
  Player,
  applyMove,
  countPieces,
  createInitialBoard,
  findValidMoves,
  getWinner,
  hasAnyValidMove,
  otherPlayer
} from "@/lib/othello";
import {
  Position,
  SpecialMoveResult,
  SpecialState,
  applySpecialNormalMove,
  applySpecialSkill,
  applySpFollowup,
  applyTwentySpDefense,
  chooseSpecialCpuMove,
  chooseSpecialCpuSkill,
  createInitialSpecialState,
  getSpTargets,
  getSpecialValidMoves,
  hasAnySpecialMove
} from "@/lib/specialOthello";

type CpuResponse = {
  move: { row: number; col: number } | null;
  board: Board;
  nextPlayer: Player;
  message: string;
};

const human: Player = "black";
const cpu: Player = "white";
const cpuThinkDelayMs = 3000;

export default function Home() {
  const [scene, setScene] = useState<Scene>("title");
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(human);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("遊ぶモードを選んでください。");
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>("normal");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmTitleOpen, setConfirmTitleOpen] = useState(false);
  const [specialAction, setSpecialAction] = useState<SpecialActionType>("normal");
  const [specialState, setSpecialState] = useState<SpecialState>(() => createInitialSpecialState());
  const [selectedSpSkill, setSelectedSpSkill] = useState<SpSkill | null>(null);
  const [pending20Result, setPending20Result] = useState<SpecialMoveResult | null>(null);
  const [comboMode, setComboMode] = useState(false);
  const [specialVsCpu, setSpecialVsCpu] = useState(false);
  const cpuRequestId = useRef(0);

  const counts = useMemo(() => countPieces(board), [board]);
  const validMoves = useMemo(
    () =>
      gameMode === "special"
        ? getSpecialValidMoves(board, currentPlayer, specialState)
        : findValidMoves(board, currentPlayer),
    [board, currentPlayer, gameMode, specialState]
  );
  const spTargets = useMemo(
    () => (gameMode === "special" ? getSpTargets(board, currentPlayer) : []),
    [board, currentPlayer, gameMode]
  );
  const validMoveKeys = useMemo(
    () =>
      new Set(
        specialAction === "sp" && selectedSpSkill
          ? spTargets.map((target) => `${target.row}-${target.col}`)
          : validMoves.map((move) => `${move.row}-${move.col}`)
      ),
    [selectedSpSkill, specialAction, spTargets, validMoves]
  );
  const spTargetKeys = useMemo(
    () => new Set(spTargets.map((target) => `${target.row}-${target.col}`)),
    [spTargets]
  );

  function startGame(mode: GameMode) {
    if (mode === "special") {
      setScene("specialMenu");
      setMessage("特殊オセロのメニューです。");
      return;
    }

    resetBoard(mode);
    setGameMode(mode);
    setResult(null);
    setScene("game");
  }

  function resetBoard(mode = gameMode) {
    cpuRequestId.current += 1;
    setBoard(createInitialBoard());
    setCurrentPlayer(human);
    setLastMove(null);
    setThinking(false);
    setOptionsOpen(false);
    setConfirmTitleOpen(false);
    setMessage(
      mode === "special"
        ? "特殊オセロ開始。通常着手でSPをため、SPECIALで技を使えます。"
        : mode === "pvp"
        ? "黒の番です。置ける場所が光ります。"
        : "黒のあなたから開始です。置ける場所が光ります。"
    );
    if (mode === "special") {
      setSpecialState(createInitialSpecialState());
    }
    resetSpecialControls();
  }

  function goTitle() {
    cpuRequestId.current += 1;
    setScene("title");
    setGameMode(null);
    setResult(null);
    setBoard(createInitialBoard());
    setCurrentPlayer(human);
    setLastMove(null);
    setThinking(false);
    setOptionsOpen(false);
    setConfirmTitleOpen(false);
    setMessage("遊ぶモードを選んでください。");
    setSpecialState(createInitialSpecialState());
    setSpecialVsCpu(false);
    resetSpecialControls();
  }

  function finishGame(finalBoard: Board) {
    const finalCounts = countPieces(finalBoard);
    cpuRequestId.current += 1;
    setBoard(finalBoard);
    setThinking(false);
    setOptionsOpen(false);
    setConfirmTitleOpen(false);
    setResult({
      blackCount: finalCounts.black,
      whiteCount: finalCounts.white,
      winner: getWinner(finalBoard)
    });
    setScene("result");
  }

  function startSpecialPlay(vsCpu = false) {
    resetBoard("special");
    setSpecialState(createInitialSpecialState());
    setSpecialVsCpu(vsCpu);
    setGameMode("special");
    setResult(null);
    setScene("game");
  }

  function resetSpecialControls() {
    setSpecialAction("normal");
    setSelectedSpSkill(null);
    setPending20Result(null);
    setComboMode(false);
  }

  async function askCpu(nextBoard: Board, requestId: number) {
    setThinking(true);
    setMessage("あなたの着手結果です。CPU が考えています...");

    try {
      await wait(cpuThinkDelayMs);
      if (requestId !== cpuRequestId.current) return;

      let boardAfterCpu = nextBoard;
      let cpuMessage = "";
      let latestCpuMove: Position | null = null;
      let nextTurn: Player = human;

      do {
        const response = await fetch("/api/cpu-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board: boardAfterCpu, level: cpuLevel, player: cpu })
        });

        if (!response.ok) {
          throw new Error("CPU move failed");
        }

        const data = (await response.json()) as CpuResponse;
        if (requestId !== cpuRequestId.current) return;

        boardAfterCpu = data.board;
        cpuMessage = data.message;
        if (data.move) {
          latestCpuMove = data.move;
        }
        nextTurn = data.nextPlayer;

        if (!hasAnyValidMove(boardAfterCpu, human) && !hasAnyValidMove(boardAfterCpu, cpu)) {
          finishGame(boardAfterCpu);
          return;
        }
      } while (
        nextTurn === cpu &&
        hasAnyValidMove(boardAfterCpu, cpu) &&
        !hasAnyValidMove(boardAfterCpu, human)
      );

      if (requestId !== cpuRequestId.current) return;
      setBoard(boardAfterCpu);
      if (latestCpuMove) {
        setLastMove(latestCpuMove);
      }
      setCurrentPlayer(nextTurn);
      setMessage(cpuMessage);
    } catch {
      if (requestId !== cpuRequestId.current) return;
      setCurrentPlayer(human);
      setMessage("CPU の処理に失敗しました。もう一度置いてみてください。");
    } finally {
      if (requestId === cpuRequestId.current) {
        setThinking(false);
      }
    }
  }

  async function handleCellClick(row: number, col: number) {
    if (!gameMode || thinking || optionsOpen || scene !== "game") return;
    if (!validMoveKeys.has(`${row}-${col}`)) return;

    if (gameMode === "special") {
      handleSpecialCellClick(row, col);
      return;
    }

    const nextBoard = applyMove(board, currentPlayer, row, col);
    if (!nextBoard) return;

    setBoard(nextBoard);
    setLastMove({ row, col });

    if (!hasAnyValidMove(nextBoard, "black") && !hasAnyValidMove(nextBoard, "white")) {
      finishGame(nextBoard);
      return;
    }

    const nextPlayer = otherPlayer(currentPlayer);

    if (!hasAnyValidMove(nextBoard, nextPlayer)) {
      setCurrentPlayer(currentPlayer);
      setMessage(
        `${playerLabel(nextPlayer)}は置ける場所がないためパスです。${playerLabel(currentPlayer)}の番です。`
      );
      return;
    }

    setCurrentPlayer(nextPlayer);

    if (gameMode === "cpu" && nextPlayer === cpu) {
      const requestId = cpuRequestId.current + 1;
      cpuRequestId.current = requestId;
      await askCpu(nextBoard, requestId);
      return;
    }

    setMessage(`${playerLabel(nextPlayer)}の番です。`);
  }

  function handleSpecialCellClick(row: number, col: number) {
    if (specialAction === "sp" && selectedSpSkill) {
      handleSpTarget({ row, col });
      return;
    }

    const result = applySpecialNormalMove(board, currentPlayer, specialState, row, col);
    if (!result) return;

    setBoard(result.board);
    setLastMove({ row, col });
    setSpecialState(result.specialState);
    endSpecialTurn(result.board, result.specialState, result.bonusMessage, currentPlayer);
  }

  function handleSpTarget(target: Position) {
    if (!selectedSpSkill) return;

    if (comboMode && pending20Result) {
      const result = applySpFollowup(
        pending20Result.board,
        currentPlayer,
        pending20Result.specialState,
        target
      );
      if (!result) return;
      const mergedResult = {
        ...result,
        affected: [...pending20Result.affected, ...result.affected],
        flipped: [...pending20Result.flipped, ...result.flipped],
        bonusMessage: "20SP COMBO! 連撃が決まりました。"
      };
      setBoard(mergedResult.board);
      setLastMove(target);
      setSpecialState(mergedResult.specialState);
      resetSpecialControls();
      endSpecialTurn(mergedResult.board, mergedResult.specialState, mergedResult.bonusMessage, currentPlayer);
      return;
    }

    const result = applySpecialSkill(board, currentPlayer, specialState, selectedSpSkill, target);
    if (!result) return;

    if (selectedSpSkill === 20) {
      setBoard(result.board);
      setLastMove(target);
      setSpecialState(result.specialState);
      setPending20Result(result);
      setSelectedSpSkill(null);
      setMessage("20SP追加効果を選んでください。");
      return;
    }

    setBoard(result.board);
    setLastMove(target);
    setSpecialState(result.specialState);
    resetSpecialControls();
    endSpecialTurn(result.board, result.specialState, result.bonusMessage, currentPlayer);
  }

  function handleSelectSpSkill(skill: SpSkill) {
    if (skill === 5) {
      const targets = getSpTargets(board, currentPlayer);
      const target = targets[Math.floor(Math.random() * targets.length)];
      if (!target) return;
      const result = applySpecialSkill(board, currentPlayer, specialState, 5, target);
      if (!result) return;
      setBoard(result.board);
      setLastMove(target);
      setSpecialState(result.specialState);
      resetSpecialControls();
      endSpecialTurn(result.board, result.specialState, result.bonusMessage, currentPlayer);
      return;
    }

    setSelectedSpSkill(skill);
    setMessage(`${skill}SPの対象にする角以外の相手石を選んでください。`);
  }

  function handleSelectSpEffect(effect: SpEffect) {
    if (!pending20Result) return;

    if (effect === "combo") {
      setComboMode(true);
      setSelectedSpSkill(20);
      setMessage("連撃対象にする角以外の相手石をもう1つ選んでください。");
      return;
    }

    const nextResult = applyTwentySpDefense(currentPlayer, pending20Result);
    setBoard(nextResult.board);
    setSpecialState(nextResult.specialState);
    resetSpecialControls();
    endSpecialTurn(nextResult.board, nextResult.specialState, "20SP DEFENSE! 防衛効果を選びました。", currentPlayer);
  }

  function endSpecialTurn(
    nextBoard: Board,
    nextSpecialState: SpecialState,
    bonusMessage: string | null,
    actingPlayer: Player
  ) {
    if (!hasAnySpecialMove(nextBoard, "black", nextSpecialState) && !hasAnySpecialMove(nextBoard, "white", nextSpecialState)) {
      finishGame(nextBoard);
      return;
    }

    const nextPlayer = otherPlayer(actingPlayer);
    if (!hasAnySpecialMove(nextBoard, nextPlayer, nextSpecialState)) {
      if (specialVsCpu && actingPlayer === cpu) {
        runSpecialCpuTurn(nextBoard, nextSpecialState, `${bonusMessage ? `${bonusMessage} ` : ""}黒は行動できないためパスです。`);
        return;
      }

      setCurrentPlayer(actingPlayer);
      setMessage(
        `${bonusMessage ? `${bonusMessage} ` : ""}${playerLabel(nextPlayer)}は行動できないためパスです。${playerLabel(actingPlayer)}の番です。`
      );
      return;
    }

    if (specialVsCpu && nextPlayer === cpu) {
      runSpecialCpuTurn(nextBoard, nextSpecialState, bonusMessage);
      return;
    }

    setCurrentPlayer(nextPlayer);
    setMessage(`${bonusMessage ? `${bonusMessage} ` : ""}${playerLabel(nextPlayer)}の番です。`);
  }

  function runSpecialCpuTurn(nextBoard: Board, nextSpecialState: SpecialState, previousMessage: string | null) {
    const requestId = cpuRequestId.current + 1;
    cpuRequestId.current = requestId;
    setBoard(nextBoard);
    setSpecialState(nextSpecialState);
    setCurrentPlayer(cpu);
    setThinking(true);
    setMessage(`${previousMessage ? `${previousMessage} ` : ""}あなたの着手結果です。CPU が考えています...`);

    window.setTimeout(() => {
      if (requestId !== cpuRequestId.current) return;
      finishSpecialCpuTurn(nextBoard, nextSpecialState, previousMessage, requestId);
    }, cpuThinkDelayMs);
  }

  function finishSpecialCpuTurn(
    nextBoard: Board,
    nextSpecialState: SpecialState,
    previousMessage: string | null,
    requestId: number
  ) {
    if (requestId !== cpuRequestId.current) return;

    const cpuSkill = chooseSpecialCpuSkill(nextBoard, cpu, nextSpecialState, cpuLevel);
    if (cpuSkill) {
      const result = applySpecialSkill(
        nextBoard,
        cpu,
        nextSpecialState,
        cpuSkill.cost,
        cpuSkill.target,
        cpuSkill.effect,
        cpuSkill.comboTarget
      );

      if (result) {
        setThinking(false);
        setBoard(result.board);
        setLastMove(cpuSkill.comboTarget ?? cpuSkill.target);
        setSpecialState(result.specialState);
        endSpecialTurn(
          result.board,
          result.specialState,
          `${previousMessage ? `${previousMessage} ` : ""}CPUが${cpuSkill.cost}SP技を使用しました。${result.bonusMessage ?? ""}`.trim(),
          cpu
        );
        return;
      }
    }

    const cpuMove = chooseSpecialCpuMove(nextBoard, cpu, nextSpecialState, cpuLevel);
    if (!cpuMove) {
      setThinking(false);
      setBoard(nextBoard);
      setSpecialState(nextSpecialState);
      setCurrentPlayer(human);
      setMessage(`${previousMessage ? `${previousMessage} ` : ""}CPUは通常着手できないためパスです。黒の番です。`);
      return;
    }

    const result = applySpecialNormalMove(nextBoard, cpu, nextSpecialState, cpuMove.row, cpuMove.col);
    if (!result) {
      setThinking(false);
      return;
    }

    setThinking(false);
    setBoard(result.board);
    setLastMove({ row: cpuMove.row, col: cpuMove.col });
    setSpecialState(result.specialState);
    endSpecialTurn(
      result.board,
      result.specialState,
      `${previousMessage ? `${previousMessage} ` : ""}CPUが通常着手しました。${result.bonusMessage ?? ""}`.trim(),
      cpu
    );
  }

  if (scene === "title") {
    return <TitleScene notice={message} onStart={startGame} />;
  }

  if (scene === "specialMenu") {
    return (
      <SpecialMenuScene
        onPlayCpu={() => startSpecialPlay(true)}
        onPlayPvp={() => startSpecialPlay(false)}
        onTitle={goTitle}
        onTutorial={() => setScene("tutorial")}
      />
    );
  }

  if (scene === "tutorial") {
    return <TutorialScene onBack={() => setScene("specialMenu")} onPlay={() => startSpecialPlay(false)} />;
  }

  if (scene === "result" && result && gameMode) {
    return (
      <ResultScene
        gameMode={gameMode}
        onRetry={() => (gameMode === "special" ? startSpecialPlay(specialVsCpu) : startGame(gameMode))}
        onTitle={goTitle}
        result={result}
      />
    );
  }

  return (
    <GameScene
      board={board}
      confirmTitleOpen={confirmTitleOpen}
      counts={counts}
      currentPlayer={currentPlayer}
      gameMode={gameMode ?? "cpu"}
      isCpuGame={gameMode === "cpu" || (gameMode === "special" && specialVsCpu)}
      lastMove={lastMove}
      cpuLevel={cpuLevel}
      message={message}
      onCancelSp={resetSpecialControls}
      onCancelTitle={() => setConfirmTitleOpen(false)}
      onCellClick={handleCellClick}
      onConfirmTitle={goTitle}
      onOpenTitleConfirm={() => setConfirmTitleOpen(true)}
      onReset={() => resetBoard()}
      onSelectCpuLevel={setCpuLevel}
      onSelectSpEffect={handleSelectSpEffect}
      onSelectSpSkill={handleSelectSpSkill}
      onSetSpecialAction={(action) => {
        setSpecialAction(action);
        setSelectedSpSkill(null);
        setPending20Result(null);
        setComboMode(false);
      }}
      onToggleOptions={(open) => {
        setOptionsOpen(open);
        if (!open) setConfirmTitleOpen(false);
      }}
      optionsOpen={optionsOpen}
      selectedSpSkill={selectedSpSkill}
      specialAction={specialAction}
      specialState={gameMode === "special" ? specialState : null}
      spEffectPending={Boolean(pending20Result)}
      spTargetKeys={spTargetKeys}
      thinking={thinking}
      validMoveKeys={validMoveKeys}
    />
  );
}

function playerLabel(player: Player) {
  return player === "black" ? "黒" : "白";
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
