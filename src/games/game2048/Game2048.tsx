import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import "./Game2048.css";

const GRID_SIZE = 4;

type Grid = number[][]; // 0 = 빈칸

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

/**
 * ============================================================
 *  2048 담당자용 스켈레톤
 * ============================================================
 * 아래 상태/구조는 이미 잡혀 있습니다. 담당자가 채워야 할 부분은
 * `// TODO(2048)` 로 표시해 두었습니다. 게임 규칙:
 *
 *  1. 4x4 보드에서 시작 시 타일 2개(값 2 또는 4)를 무작위 위치에 생성
 *  2. 방향키(↑↓←→)로 모든 타일을 해당 방향 끝까지 밀기
 *  3. 미는 도중 같은 숫자 타일이 만나면 합쳐지고 점수에 더해짐
 *  4. 이동/병합이 하나라도 일어났다면 새 타일 1개를 무작위 생성
 *  5. 더 이상 이동할 곳이 없으면 게임 오버
 *
 * 점수/최고점 저장(useHighScore), 레이아웃(GameShell)은 이미 연결되어
 * 있으니 건드릴 필요 없습니다. 이 파일과 Game2048.css만 수정하세요.
 * ============================================================
 */
export function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [highScore, submitScore] = useHighScore("2048");

  useEffect(() => {
    submitScore(score);
  }, [score, submitScore]);

  const handleMove = useCallback((direction: "up" | "down" | "left" | "right") => {
    // TODO(2048): 방향에 따라 grid를 밀고 합치는 로직 구현
    // 1) 현재 grid를 복사
    // 2) direction에 맞춰 각 행/열을 압축 + 병합
    // 3) 병합된 값만큼 setScore로 점수 누적
    // 4) 변화가 있었다면 빈 칸 중 하나에 새 타일(2 또는 4) 추가
    // 5) setGrid로 반영
    setGrid((g) => g); // TODO(2048): 계산된 새 grid로 교체
    setScore((s) => s); // TODO(2048): 이번 이동에서 합쳐진 값만큼 더하기
    console.log("TODO: 2048 이동 로직 구현 필요 ->", direction);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const direction = map[e.key];
      if (!direction) return;
      e.preventDefault();
      handleMove(direction);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove]);

  return (
    <GameShell
      title="2048"
      accentVar="--accent-2048"
      score={score}
      highScore={highScore}
      controlsHint="방향키로 타일을 밀어보세요"
    >
      <div className="game2048-board">
        {grid.flat().map((value, i) => (
          <div key={i} className="game2048-tile" data-value={value || undefined}>
            {value !== 0 && value}
          </div>
        ))}
      </div>
    </GameShell>
  );
}
