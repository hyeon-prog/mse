import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import "./Tetris.css";

const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL_MS = 800;

// 표준 7종 테트로미노 (SRS 회전 없이 기본 형태만 제공 - 회전 구현은 담당자 몫)
export const TETROMINOES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
} as const;

type TetrominoName = keyof typeof TETROMINOES;

interface ActivePiece {
  name: TetrominoName;
  shape: number[][];
  row: number; // 보드 기준 좌상단 행
  col: number; // 보드 기준 좌상단 열
}

function randomPieceName(): TetrominoName {
  const names = Object.keys(TETROMINOES) as TetrominoName[];
  return names[Math.floor(Math.random() * names.length)];
}

function spawnPiece(): ActivePiece {
  const name = randomPieceName();
  const shape = TETROMINOES[name].map((row) => [...row]);
  return { name, shape, row: 0, col: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2) };
}

function createEmptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * ============================================================
 *  테트리스 담당자용 스켈레톤
 * ============================================================
 * 이미 준비되어 있는 것:
 *  - 10x20 board 상태 (0 = 빈칸, 그 외 값 = 고정된 블록)
 *  - 7종 테트로미노 모양 정의(TETROMINOES)와 무작위 스폰(spawnPiece)
 *  - 일정 간격(DROP_INTERVAL_MS)마다 자동으로 아래로 내리는 타이머
 *  - 방향키 입력 이벤트 뼈대 (← → ↓ ↑)
 *
 * `// TODO(tetris)` 로 표시된 부분을 채우면 됩니다:
 *  1. 충돌 판정 함수 (`canMove`) - 현재는 항상 true를 반환하는 더미 구현
 *  2. 좌우 이동 / 소프트 드롭 처리
 *  3. 회전 처리 (배열을 90도 회전시키는 로직)
 *  4. 바닥에 닿으면 board에 합치고(lock) 새 피스 스폰
 *  5. 가득 찬 줄 찾아서 제거 + 점수 반영 + 위 칸들 한 줄씩 내리기
 *  6. 새 피스를 놓을 자리가 없으면 게임 오버
 *
 * 이 파일과 Tetris.css만 수정하세요.
 * ============================================================
 */
export function Tetris() {
  const [board] = useState<number[][]>(() => createEmptyBoard());
  const [piece, setPiece] = useState<ActivePiece>(() => spawnPiece());
  const [score, setScore] = useState(0);
  const [highScore, submitScore] = useHighScore("tetris");

  useEffect(() => {
    submitScore(score);
  }, [score, submitScore]);

  // TODO(tetris): 실제 충돌 판정으로 교체 (보드 경계 + 이미 채워진 칸 체크)
  const canMove = useCallback((_candidate: ActivePiece) => {
    return true;
  }, []);

  const moveDown = useCallback(() => {
    setPiece((prev) => {
      const candidate = { ...prev, row: prev.row + 1 };
      if (canMove(candidate)) return candidate;
      // TODO(tetris): 여기서 board에 prev를 고정(lock)하고,
      // 줄 삭제 검사 후 setScore로 점수를 올리고, spawnPiece()로 새 피스를 내려야 함
      setScore((s) => s); // TODO(tetris): 지운 줄 수에 따라 점수 반영
      console.log("TODO: 테트리스 lock + 줄 삭제 로직 구현 필요");
      return spawnPiece();
    });
  }, [canMove]);

  useEffect(() => {
    const timer = setInterval(moveDown, DROP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [moveDown]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // TODO(tetris): ArrowLeft / ArrowRight / ArrowDown / ArrowUp(회전) 처리
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        console.log("TODO: 테트리스 키 입력 처리 필요 ->", e.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 보드 위에 현재 낙하 중인 피스를 겹쳐서 렌더링
  const displayGrid = board.map((row) => [...row]);
  piece.shape.forEach((r, ri) =>
    r.forEach((v, ci) => {
      if (!v) return;
      const boardRow = piece.row + ri;
      const boardCol = piece.col + ci;
      if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
        displayGrid[boardRow][boardCol] = 1;
      }
    })
  );

  return (
    <GameShell
      title="테트리스"
      accentVar="--accent-tetris"
      score={score}
      highScore={highScore}
      controlsHint="← → 이동, ↓ 소프트 드롭, ↑ 회전"
    >
      <div className="tetris-board">
        {displayGrid.flat().map((value, i) => (
          <div key={i} className="tetris-cell" data-filled={value ? true : undefined} />
        ))}
      </div>
    </GameShell>
  );
}
