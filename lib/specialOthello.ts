import type { CpuLevel } from "./gameTypes.ts";
import type { Board, Move, Player } from "./othello.ts";
import { findValidMoves, otherPlayer } from "./othello.ts";

export const MAX_SP = 20;

export type Position = {
  row: number;
  col: number;
};

export type Protection = Position & {
  activeFor: Player;
  order: number;
  owner: Player;
};

export type BlockedCell = Position & {
  activeFor: Player;
};

export type SpecialState = {
  blockedCells: BlockedCell[];
  blackSp: number;
  protectionOrder: number;
  protectedStones: Protection[];
  whiteSp: number;
};

export type SpecialMoveResult = {
  affected: Position[];
  board: Board;
  bonusMessage: string | null;
  flipped: Position[];
  specialState: SpecialState;
};

export type SpecialCpuSkillChoice = {
  comboTarget?: Position;
  cost: 5 | 10 | 20;
  effect?: "defense" | "combo";
  target: Position;
};

const boardSize = 8;
const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
] as const;

export function createInitialSpecialState(): SpecialState {
  return {
    blockedCells: [],
    blackSp: 0,
    protectionOrder: 0,
    protectedStones: [],
    whiteSp: 0
  };
}

export function getSp(state: SpecialState, player: Player) {
  return player === "black" ? state.blackSp : state.whiteSp;
}

export function setSp(state: SpecialState, player: Player, value: number): SpecialState {
  const nextValue = Math.max(0, Math.min(MAX_SP, value));
  return player === "black"
    ? { ...state, blackSp: nextValue }
    : { ...state, whiteSp: nextValue };
}

export function getSpecialValidMoves(board: Board, player: Player, state: SpecialState): Move[] {
  const blocked = new Set(
    state.blockedCells
      .filter((cell) => cell.activeFor === player)
      .map((cell) => positionKey(cell))
  );
  return findValidMoves(board, player).filter((move) => !blocked.has(positionKey(move)));
}

export function chooseSpecialCpuMove(
  board: Board,
  player: Player,
  state: SpecialState,
  level: CpuLevel = "normal"
): Move | null {
  const moves = getSpecialValidMoves(board, player, state);
  if (moves.length === 0) return null;
  if (level === "easy") return moves[Math.floor(Math.random() * moves.length)];
  return [...moves].sort((a, b) => scoreSpecialCpuMove(b, board, player, state, level) - scoreSpecialCpuMove(a, board, player, state, level))[0];
}

export function chooseSpecialCpuSkill(
  board: Board,
  player: Player,
  state: SpecialState,
  level: CpuLevel = "normal"
): SpecialCpuSkillChoice | null {
  const targets = getSpTargets(board, player);
  const sp = getSp(state, player);
  if (sp < 5 || targets.length === 0) return null;
  if (level === "easy" && sp < 10) return null;

  const cost = sp >= 20 ? 20 : sp >= 10 ? 10 : 5;
  const rankedTargets = rankSpTargets(board, player, targets);
  const target = rankedTargets[0];
  if (!target) return null;

  if (cost === 20) {
    const comboTarget = rankedTargets.find((candidate) => positionKey(candidate) !== positionKey(target));
    return comboTarget
      ? { comboTarget, cost, effect: "combo", target }
      : { cost, effect: "defense", target };
  }

  return { cost, target };
}

export function applySpecialNormalMove(
  board: Board,
  player: Player,
  state: SpecialState,
  row: number,
  col: number
): SpecialMoveResult | null {
  if (!getSpecialValidMoves(board, player, state).some((move) => move.row === row && move.col === col)) {
    return null;
  }

  const rawFlips = findFlips(board, player, row, col);
  if (rawFlips.length === 0) return null;

  const activeProtection = protectionSetFor(state, player);
  const nextBoard = cloneBoard(board);
  const flipped = rawFlips.filter((flip) => !activeProtection.has(positionKey(flip)));
  nextBoard[row][col] = player;
  flipped.forEach((flip) => {
    nextBoard[flip.row][flip.col] = player;
  });

  let nextState = clearTurnEffects(state, player);
  nextState = setSp(nextState, player, getSp(nextState, player) + rawFlips.length);
  const bonus = applyFlipBonus(nextBoard, player, nextState, { row, col }, flipped, rawFlips.length);

  return {
    affected: [{ row, col }, ...flipped],
    board: bonus.board,
    bonusMessage: bonus.message,
    flipped,
    specialState: bonus.state
  };
}

export function getSpTargets(board: Board, player: Player): Position[] {
  const opponent = otherPlayer(player);
  const targets: Position[] = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (board[row][col] === opponent && !isCorner(row, col)) {
        targets.push({ row, col });
      }
    }
  }

  return targets;
}

export function applySpecialSkill(
  board: Board,
  player: Player,
  state: SpecialState,
  cost: 5 | 10 | 20,
  target: Position,
  effect?: "defense" | "combo",
  comboTarget?: Position
): SpecialMoveResult | null {
  if (getSp(state, player) < cost || !isSpTarget(board, player, target)) return null;

  let nextState = clearTurnEffects(setSp(state, player, getSp(state, player) - cost), player);
  const first = convertStoneAndFlip(board, player, target);
  let nextBoard = first.board;
  let affected = first.affected;
  let flipped = first.flipped;
  let message = `${cost}SP! ${playerLabel(player)}が特殊技を使用しました。`;

  if (cost === 20 && effect === "combo" && comboTarget && isSpTarget(nextBoard, player, comboTarget)) {
    const second = convertStoneAndFlip(nextBoard, player, comboTarget);
    nextBoard = second.board;
    affected = [...affected, ...second.affected];
    flipped = [...flipped, ...second.flipped];
    message = "20SP COMBO! 2つの相手石を変化させました。";
  }

  if (cost === 20 && effect === "defense") {
    const protectedTargets = [...first.flipped];
    nextState = addProtections(nextState, player, otherPlayer(player), protectedTargets);
    nextState = {
      ...nextState,
      blockedCells: [
        ...nextState.blockedCells,
        ...neighbors(target).map((cell) => ({ ...cell, activeFor: otherPlayer(player) }))
      ]
    };
    message = "20SP DEFENSE! 反転石を保護し、周囲を封鎖しました。";
  }

  return {
    affected,
    board: nextBoard,
    bonusMessage: message,
    flipped,
    specialState: nextState
  };
}

export function applyTwentySpDefense(
  player: Player,
  result: SpecialMoveResult
): SpecialMoveResult {
  const firstTarget = result.affected[0];
  if (!firstTarget) return result;

  let nextState = addProtections(result.specialState, player, otherPlayer(player), result.flipped);
  nextState = {
    ...nextState,
    blockedCells: [
      ...nextState.blockedCells,
      ...neighbors(firstTarget).map((cell) => ({ ...cell, activeFor: otherPlayer(player) }))
    ]
  };

  return {
    ...result,
    bonusMessage: "20SP DEFENSE! 反転石を保護し、起点石の周囲を封鎖しました。",
    specialState: nextState
  };
}

export function applySpFollowup(
  board: Board,
  player: Player,
  state: SpecialState,
  target: Position
): SpecialMoveResult | null {
  if (!isSpTarget(board, player, target)) return null;
  const result = convertStoneAndFlip(board, player, target);
  return {
    affected: result.affected,
    board: result.board,
    bonusMessage: null,
    flipped: result.flipped,
    specialState: state
  };
}

export function hasAnySpecialMove(board: Board, player: Player, state: SpecialState): boolean {
  return (
    getSpecialValidMoves(board, player, state).length > 0 ||
    (getSp(state, player) >= 5 && getSpTargets(board, player).length > 0)
  );
}

export function isProtected(state: SpecialState, row: number, col: number): boolean {
  return state.protectedStones.some((stone) => stone.row === row && stone.col === col);
}

export function isBlockedFor(state: SpecialState, player: Player, row: number, col: number): boolean {
  return state.blockedCells.some((cell) => cell.activeFor === player && cell.row === row && cell.col === col);
}

function applyFlipBonus(
  board: Board,
  player: Player,
  state: SpecialState,
  placed: Position,
  flipped: Position[],
  flippedCount: number
) {
  const opponent = otherPlayer(player);
  if (flippedCount <= 2) {
    return { board, state, message: null };
  }

  if (flippedCount <= 4) {
    const opponentMoves = getSpecialValidMoves(board, opponent, state);
    if (opponentMoves.length <= 1) {
      return { board, state, message: `${flippedCount} FLIP! 封鎖候補が少ないためボーナスなし。` };
    }

    const target = opponentMoves[Math.floor(Math.random() * opponentMoves.length)];
    return {
      board,
      state: { ...state, blockedCells: [...state.blockedCells, { row: target.row, col: target.col, activeFor: opponent }] },
      message: `${flippedCount} FLIP! 相手の合法手を1マス封鎖しました。`
    };
  }

  if (flippedCount === 5) {
    return {
      board,
      state: {
        ...state,
        blockedCells: [...state.blockedCells, ...neighbors(placed).map((cell) => ({ ...cell, activeFor: opponent }))]
      },
      message: "5 FLIP! 置いた石の周囲を次の相手ターンだけ封鎖しました。"
    };
  }

  if (flippedCount < 18) {
    return {
      board,
      state: addProtections(state, player, opponent, flipped),
      message: `${flippedCount} FLIP! 反転した石を次の相手ターンだけ保護しました。`
    };
  }

  const takeover = board.map((line) => line.map((cell) => (cell === "empty" ? cell : player)));
  return {
    board: takeover,
    state,
    message: "18+ FLIP! 盤上の石をすべて自分色にしました。"
  };
}

function convertStoneAndFlip(board: Board, player: Player, target: Position) {
  const nextBoard = cloneBoard(board);
  nextBoard[target.row][target.col] = player;
  const flipped = findFlips(nextBoard, player, target.row, target.col);
  flipped.forEach((flip) => {
    nextBoard[flip.row][flip.col] = player;
  });
  return {
    affected: [target, ...flipped],
    board: nextBoard,
    flipped
  };
}

function addProtections(state: SpecialState, owner: Player, activeFor: Player, stones: Position[]): SpecialState {
  let order = state.protectionOrder;
  const existing = new Set(state.protectedStones.map((stone) => positionKey(stone)));
  const additions: Protection[] = [];

  stones.forEach((stone) => {
    if (!existing.has(positionKey(stone))) {
      order += 1;
      additions.push({ ...stone, activeFor, order, owner });
      existing.add(positionKey(stone));
    }
  });

  return {
    ...state,
    protectionOrder: order,
    protectedStones: [...state.protectedStones, ...additions].sort((a, b) => a.order - b.order)
  };
}

function clearTurnEffects(state: SpecialState, player: Player): SpecialState {
  return {
    ...state,
    blockedCells: state.blockedCells.filter((cell) => cell.activeFor !== player),
    protectedStones: state.protectedStones.filter((stone) => stone.activeFor !== player)
  };
}

function findFlips(board: Board, player: Player, startRow: number, startCol: number): Position[] {
  const opponent = otherPlayer(player);
  const flips: Position[] = [];

  for (const [rowDirection, colDirection] of directions) {
    const line: Position[] = [];
    let row = startRow + rowDirection;
    let col = startCol + colDirection;

    while (isInside(row, col) && board[row][col] === opponent) {
      line.push({ row, col });
      row += rowDirection;
      col += colDirection;
    }

    if (line.length > 0 && isInside(row, col) && board[row][col] === player) {
      flips.push(...line);
    }
  }

  return flips;
}

function protectionSetFor(state: SpecialState, player: Player) {
  return new Set(
    state.protectedStones
      .filter((stone) => stone.activeFor === player)
      .map((stone) => positionKey(stone))
  );
}

function isSpTarget(board: Board, player: Player, target: Position) {
  return (
    isInside(target.row, target.col) &&
    !isCorner(target.row, target.col) &&
    board[target.row][target.col] === otherPlayer(player)
  );
}

function rankSpTargets(board: Board, player: Player, targets: Position[]): Position[] {
  return [...targets].sort((a, b) => {
    const bFlips = convertStoneAndFlip(board, player, b).flipped.length;
    const aFlips = convertStoneAndFlip(board, player, a).flipped.length;
    if (bFlips !== aFlips) return bFlips - aFlips;
    return distanceFromCenter(a) - distanceFromCenter(b);
  });
}

function distanceFromCenter(position: Position): number {
  return Math.abs(position.row - 3.5) + Math.abs(position.col - 3.5);
}

function scoreSpecialCpuMove(
  move: Move,
  board: Board,
  player: Player,
  state: SpecialState,
  level: CpuLevel
): number {
  let score = move.flips.length * 12;

  if (isCorner(move.row, move.col)) score += 120;
  if (isEdge(move.row, move.col)) score += 24;
  if (isNearCorner(move.row, move.col)) score -= 48;

  const nextBoard = previewNormalMove(board, player, move);
  const opponentMoves = getSpecialValidMoves(nextBoard, otherPlayer(player), state);
  const opponentCornerMoves = opponentMoves.filter((opponentMove) => isCorner(opponentMove.row, opponentMove.col));
  const opponentBestReply = Math.max(
    0,
    ...opponentMoves.map((opponentMove) =>
      evaluateBoardForPlayer(previewNormalMove(nextBoard, otherPlayer(player), opponentMove), otherPlayer(player))
    )
  );
  const cpuBestFollowup =
    level === "hard"
      ? Math.max(
          0,
          ...opponentMoves.map((opponentMove) => {
            const afterReply = previewNormalMove(nextBoard, otherPlayer(player), opponentMove);
            const followups = getSpecialValidMoves(afterReply, player, state);
            return Math.max(
              0,
              ...followups.map((followup) =>
                evaluateBoardForPlayer(previewNormalMove(afterReply, player, followup), player)
              )
            );
          })
        )
      : 0;

  score += evaluateBoardForPlayer(nextBoard, player);
  score -= opponentMoves.length * 4;
  score -= opponentCornerMoves.length * 80;
  score -= opponentBestReply * 0.35;
  if (level === "hard") score += cpuBestFollowup * 0.18;

  return score;
}

function evaluateBoardForPlayer(board: Board, player: Player): number {
  const opponent = otherPlayer(player);
  let score = 0;

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const cell = board[row][col];
      if (cell === "empty") continue;

      const ownerScore = cell === player ? 1 : -1;
      score += ownerScore * 2;
      if (isCorner(row, col)) score += ownerScore * 28;
      if (isEdge(row, col)) score += ownerScore * 5;
      if (isNearCorner(row, col) && board[row][col] === player && cornerNear(row, col, board) !== player) {
        score -= 10;
      }
      if (cell === opponent && isNearCorner(row, col) && cornerNear(row, col, board) !== opponent) {
        score += 6;
      }
    }
  }

  return score;
}

function cornerNear(row: number, col: number, board: Board): Player | "empty" {
  const cornerRow = row < boardSize / 2 ? 0 : boardSize - 1;
  const cornerCol = col < boardSize / 2 ? 0 : boardSize - 1;
  return board[cornerRow][cornerCol];
}

function previewNormalMove(board: Board, player: Player, move: Move): Board {
  const nextBoard = cloneBoard(board);
  nextBoard[move.row][move.col] = player;
  move.flips.forEach((flip) => {
    nextBoard[flip.row][flip.col] = player;
  });
  return nextBoard;
}

function neighbors(position: Position): Position[] {
  const cells: Position[] = [];
  for (let row = position.row - 1; row <= position.row + 1; row += 1) {
    for (let col = position.col - 1; col <= position.col + 1; col += 1) {
      if ((row !== position.row || col !== position.col) && isInside(row, col)) {
        cells.push({ row, col });
      }
    }
  }
  return cells;
}

function positionKey(position: Position) {
  return `${position.row}-${position.col}`;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function isInside(row: number, col: number): boolean {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function isCorner(row: number, col: number): boolean {
  return (
    (row === 0 && col === 0) ||
    (row === 0 && col === boardSize - 1) ||
    (row === boardSize - 1 && col === 0) ||
    (row === boardSize - 1 && col === boardSize - 1)
  );
}

function isEdge(row: number, col: number): boolean {
  return row === 0 || row === boardSize - 1 || col === 0 || col === boardSize - 1;
}

function isNearCorner(row: number, col: number): boolean {
  return (
    (row <= 1 && col <= 1) ||
    (row <= 1 && col >= boardSize - 2) ||
    (row >= boardSize - 2 && col <= 1) ||
    (row >= boardSize - 2 && col >= boardSize - 2)
  );
}

function playerLabel(player: Player) {
  return player === "black" ? "黒" : "白";
}
