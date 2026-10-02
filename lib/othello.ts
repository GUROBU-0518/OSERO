export type Player = "black" | "white";
export type Cell = Player | "empty";
export type Board = Cell[][];
export type Move = {
  row: number;
  col: number;
  flips: Array<{ row: number; col: number }>;
};

const size = 8;
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

export function createInitialBoard(): Board {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col): Cell => {
      if ((row === 3 && col === 3) || (row === 4 && col === 4)) return "white";
      if ((row === 3 && col === 4) || (row === 4 && col === 3)) return "black";
      return "empty";
    })
  );
}

export function otherPlayer(player: Player): Player {
  return player === "black" ? "white" : "black";
}

export function findValidMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row]?.[col] !== "empty") continue;

      const flips = findFlips(board, player, row, col);
      if (flips.length > 0) {
        moves.push({ row, col, flips });
      }
    }
  }

  return moves;
}

export function applyMove(
  board: Board,
  player: Player,
  row: number,
  col: number
): Board | null {
  const flips = findFlips(board, player, row, col);
  if (board[row]?.[col] !== "empty" || flips.length === 0) return null;

  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = player;
  for (const flip of flips) {
    nextBoard[flip.row][flip.col] = player;
  }

  return nextBoard;
}

export function hasAnyValidMove(board: Board, player: Player): boolean {
  return findValidMoves(board, player).length > 0;
}

export function countPieces(board: Board): Record<Player, number> {
  return board.flat().reduce(
    (counts, cell) => {
      if (cell === "black" || cell === "white") {
        counts[cell] += 1;
      }
      return counts;
    },
    { black: 0, white: 0 }
  );
}

export function getWinner(board: Board): Player | "draw" {
  const counts = countPieces(board);
  if (counts.black === counts.white) return "draw";
  return counts.black > counts.white ? "black" : "white";
}

export function chooseCpuMove(board: Board, player: Player): Move | null {
  const moves = findValidMoves(board, player);
  if (moves.length === 0) return null;

  return moves
    .map((move) => ({ move, score: scoreMove(board, player, move) }))
    .sort((a, b) => b.score - a.score)[0].move;
}

function findFlips(
  board: Board,
  player: Player,
  startRow: number,
  startCol: number
): Array<{ row: number; col: number }> {
  const opponent = otherPlayer(player);
  const flips: Array<{ row: number; col: number }> = [];

  for (const [rowDirection, colDirection] of directions) {
    const line: Array<{ row: number; col: number }> = [];
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

function scoreMove(board: Board, player: Player, move: Move): number {
  const cornerBonus = isCorner(move.row, move.col) ? 100 : 0;
  const edgeBonus = isEdge(move.row, move.col) ? 16 : 0;
  const riskyCornerPenalty = isNextToCorner(move.row, move.col) ? -28 : 0;
  const mobilityBoard = applyMove(board, player, move.row, move.col);
  const opponentMobility = mobilityBoard
    ? findValidMoves(mobilityBoard, otherPlayer(player)).length
    : 0;

  return move.flips.length * 6 + cornerBonus + edgeBonus + riskyCornerPenalty - opponentMobility * 2;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function isInside(row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function isCorner(row: number, col: number): boolean {
  return (
    (row === 0 && col === 0) ||
    (row === 0 && col === size - 1) ||
    (row === size - 1 && col === 0) ||
    (row === size - 1 && col === size - 1)
  );
}

function isEdge(row: number, col: number): boolean {
  return row === 0 || row === size - 1 || col === 0 || col === size - 1;
}

function isNextToCorner(row: number, col: number): boolean {
  const cornerNeighbors = new Set(["0-1", "1-0", "1-1", "0-6", "1-6", "1-7", "6-0", "6-1", "7-1", "6-6", "6-7", "7-6"]);
  return cornerNeighbors.has(`${row}-${col}`);
}
