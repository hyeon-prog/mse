import { useCallback, useEffect, useState } from "react";
import { highScoreKey } from "../types/game";

/**
 * 게임별 최고 점수를 localStorage에 저장/조회하는 공용 훅.
 *
 * 사용 예:
 *   const [highScore, submitScore] = useHighScore("2048");
 *   submitScore(currentScore); // 기존 최고점보다 높을 때만 갱신됨
 */
export function useHighScore(gameId: string): [number, (score: number) => void] {
  const key = highScoreKey(gameId);
  const [highScore, setHighScore] = useState<number>(() => {
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) || 0 : 0;
  });

  useEffect(() => {
    const raw = localStorage.getItem(key);
    setHighScore(raw ? Number(raw) || 0 : 0);
  }, [key]);

  const submitScore = useCallback(
    (score: number) => {
      setHighScore((prev) => {
        if (score <= prev) return prev;
        localStorage.setItem(key, String(score));
        return score;
      });
    },
    [key]
  );

  return [highScore, submitScore];
}
