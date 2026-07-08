import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import "./AppleGame.css";

const ROWS = 10;
const COLS = 17;
const TIME_LIMIT_SEC = 120;

interface Cell {
  row: number;
  col: number;
  value: number; // 1~9
  cleared: boolean;
}

function createBoard(): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      cells.push({ row, col, value: 1 + Math.floor(Math.random() * 9), cleared: false });
    }
  }
  return cells;
}

/**
 * ============================================================
 *  사과게임 담당자용 스켈레톤
 * ============================================================
 * 원본 규칙:
 *  1. 그리드에 1~9 숫자가 적힌 사과가 채워져 있음
 *  2. 마우스로 드래그해서 직사각형 범위를 선택
 *  3. 선택된 사과들의 숫자 합이 정확히 10이면 전부 제거 + 점수 획득
 *     (합이 10이 아니면 선택만 풀리고 아무 일도 없음)
 *  4. 제한 시간(기본 120초) 안에 최대한 많이 제거하는 게 목표
 *
 * 이미 준비되어 있는 것:
 *  - board 상태 (10x17, 1~9 무작위 값)
 *  - 드래그 시작/끝 좌표 상태(`dragStart`, `dragEnd`)와 마우스 이벤트 핸들러 뼈대
 *  - 타이머 카운트다운
 *
 * `// TODO(apple)` 로 표시된 부분을 채우면 됩니다.
 * 이 파일과 AppleGame.css만 수정하세요.
 * ============================================================
 */
export function AppleGame() {
  const [board, setBoard] = useState<Cell[]>(() => createBoard());
  const [score, setScore] = useState(0);
  const [highScore, submitScore] = useHighScore("apple-game");
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SEC);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    submitScore(score);
  }, [score, submitScore]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // 현재 드래그로 선택된 범위 안의 셀들 (사각형)
  const selectedCells = useMemo(() => {
    if (!dragStart || !dragEnd) return [] as Cell[];
    const rowMin = Math.min(dragStart.row, dragEnd.row);
    const rowMax = Math.max(dragStart.row, dragEnd.row);
    const colMin = Math.min(dragStart.col, dragEnd.col);
    const colMax = Math.max(dragStart.col, dragEnd.col);
    return board.filter(
      (c) => !c.cleared && c.row >= rowMin && c.row <= rowMax && c.col >= colMin && c.col <= colMax
    );
  }, [board, dragStart, dragEnd]);

  const selectedSum = selectedCells.reduce((sum, c) => sum + c.value, 0);

  function handleCellMouseDown(row: number, col: number) {
    setDragStart({ row, col });
    setDragEnd({ row, col });
  }

  function handleCellMouseEnter(row: number, col: number) {
    if (!dragStart) return;
    setDragEnd({ row, col });
  }

  function handleMouseUp() {
    // TODO(apple): selectedSum === 10 이면
    //   1) selectedCells 를 board에서 cleared: true 로 표시
    //   2) score += selectedCells.length (혹은 원하는 점수 규칙)
    // 합이 10이 아니면 아무 것도 하지 않고 선택만 초기화
    setBoard((b) => b); // TODO(apple): cleared 처리된 새 board로 교체
    setScore((s) => s); // TODO(apple): 제거한 사과 수만큼 점수 반영
    console.log("TODO: 사과게임 판정 로직 구현 필요. 현재 합 =", selectedSum);
    setDragStart(null);
    setDragEnd(null);
  }

  const isTimeUp = timeLeft === 0;

  return (
    <GameShell
      title="사과게임"
      accentVar="--accent-apple"
      score={score}
      highScore={highScore}
      controlsHint={isTimeUp ? "시간 종료! 새로고침하면 다시 시작합니다" : "드래그해서 합이 10이 되는 사과를 선택하세요"}
    >
      <div className="apple-game">
        <div className="apple-game__timer mono">⏱ {timeLeft}s</div>
        <div
          className="apple-game__board"
          ref={boardRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setDragStart(null);
            setDragEnd(null);
          }}
        >
          {board.map((cell) => {
            const isSelected = selectedCells.some((c) => c.row === cell.row && c.col === cell.col);
            return (
              <button
                key={`${cell.row}-${cell.col}`}
                className="apple-game__cell"
                data-cleared={cell.cleared || undefined}
                data-selected={isSelected || undefined}
                disabled={cell.cleared || isTimeUp}
                onMouseDown={() => handleCellMouseDown(cell.row, cell.col)}
                onMouseEnter={() => handleCellMouseEnter(cell.row, cell.col)}
              >
                {!cell.cleared && cell.value}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
