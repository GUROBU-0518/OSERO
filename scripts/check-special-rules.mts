import assert from "node:assert/strict";
import { createInitialBoard } from "../lib/othello.ts";
import {
  applySpecialNormalMove,
  applySpecialSkill,
  applyTwentySpDefense,
  chooseSpecialCpuMove,
  chooseSpecialCpuSkill,
  createInitialSpecialState,
  getSp,
  getSpTargets,
  hasAnySpecialMove,
  isBlockedFor,
  isProtected,
  setSp
} from "../lib/specialOthello.ts";

const initialBoard = createInitialBoard();
const initialState = createInitialSpecialState();

const normalMove = applySpecialNormalMove(initialBoard, "black", initialState, 2, 3);
assert.ok(normalMove, "normal move should be legal");
assert.equal(getSp(normalMove.specialState, "black"), 1, "normal flips should add SP");
assert.equal(normalMove.board[2][3], "black", "placed stone should be black");
assert.equal(normalMove.board[3][3], "black", "flipped stone should be black");

const whiteWithSp = setSp(normalMove.specialState, "white", 5);
const whiteTargets = getSpTargets(normalMove.board, "white");
assert.ok(whiteTargets.length > 0, "white should have SP targets");

const fiveSp = applySpecialSkill(normalMove.board, "white", whiteWithSp, 5, whiteTargets[0]);
assert.ok(fiveSp, "5SP should execute against a non-corner opponent stone");
assert.equal(getSp(fiveSp.specialState, "white"), 0, "5SP should consume SP");

const cpuSkillChoice = chooseSpecialCpuSkill(normalMove.board, "white", whiteWithSp);
assert.ok(cpuSkillChoice, "CPU should choose a usable SP skill when it has enough SP");
assert.equal(cpuSkillChoice.cost, 5, "CPU should choose the available 5SP skill");

const protectedBoard = [
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["empty", "white", "black", "black", "black", "black", "black", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"]
] as const;

const defenseSeed = createInitialSpecialState();
const defenseResult = applyTwentySpDefense("black", {
  affected: [{ row: 3, col: 2 }, { row: 3, col: 3 }],
  board: protectedBoard.map((row) => [...row]),
  bonusMessage: null,
  flipped: [{ row: 3, col: 3 }],
  specialState: defenseSeed
});
assert.equal(isProtected(defenseResult.specialState, 3, 3), true, "defense should protect flipped stones");
assert.equal(isBlockedFor(defenseResult.specialState, "white", 2, 1), true, "defense should block around origin");

const blockedState = {
  ...createInitialSpecialState(),
  blockedCells: [{ row: 2, col: 3, activeFor: "black" as const }]
};
assert.equal(
  applySpecialNormalMove(initialBoard, "black", blockedState, 2, 3),
  null,
  "blocked legal move should be unavailable"
);

const noSpState = createInitialSpecialState();
assert.equal(
  hasAnySpecialMove(
    [
      ["black", "white", "white", "white", "white", "white", "white", "black"],
      ["white", "white", "white", "white", "white", "white", "white", "white"],
      ["white", "white", "white", "white", "white", "white", "white", "white"],
      ["white", "white", "white", "white", "white", "white", "white", "white"],
      ["white", "white", "white", "white", "white", "white", "white", "white"],
      ["white", "white", "white", "white", "white", "white", "white", "white"],
      ["white", "white", "white", "white", "white", "white", "white", "white"],
      ["black", "white", "white", "white", "white", "white", "white", "black"]
    ],
    "black",
    noSpState
  ),
  false,
  "SP targets alone should not count as available actions without enough SP"
);

const cornerChoice = chooseSpecialCpuMove(
  [
    ["empty", "black", "white", "white", "white", "white", "white", "white"],
    ["black", "black", "white", "white", "white", "white", "white", "white"],
    ["white", "white", "white", "white", "white", "white", "white", "white"],
    ["white", "white", "white", "white", "white", "white", "white", "white"],
    ["white", "white", "white", "white", "white", "white", "white", "white"],
    ["white", "white", "white", "white", "white", "white", "white", "white"],
    ["white", "white", "white", "white", "white", "white", "white", "white"],
    ["white", "white", "white", "white", "white", "white", "white", "white"]
  ],
  "white",
  createInitialSpecialState()
);
assert.deepEqual(cornerChoice && { row: cornerChoice.row, col: cornerChoice.col }, { row: 0, col: 0 }, "CPU should value corners highly");

console.log("special rules check passed");
