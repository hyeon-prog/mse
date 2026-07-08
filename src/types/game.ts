import type { ComponentType } from "react";

/**
 * 모든 게임이 지켜야 하는 "계약(contract)".
 *
 * 새 게임을 추가하는 사람은 이 형태의 객체 하나만 만들어서
 * `src/gameRegistry.ts` 에 등록하면 로비 화면과 라우팅에 자동으로 반영됩니다.
 * 팀원들이 서로의 폴더를 건드릴 필요가 없도록 설계된 부분이라
 * 이 파일 자체는 가급적 수정하지 마세요.
 */
export interface GameModule {
  /** URL 경로 및 내부 식별자로 쓰이는 고유 id. 예: "2048", "apple-game", "tetris" */
  id: string;
  /** 로비 카드와 헤더에 노출되는 게임 이름 */
  title: string;
  /** 카드에 들어가는 한 줄 설명 */
  description: string;
  /** 카드에 표시할 이모지/짧은 텍스트 아이콘 (이미지 에셋 없이도 바로 보이도록) */
  icon: string;
  /** 카트리지 라벨 색상으로 쓰일 CSS 변수 이름. tokens.css 참고 */
  accentVar: `--accent-${string}`;
  /** 실제 게임 화면을 렌더링하는 컴포넌트 */
  Component: ComponentType;
  /** 담당자가 아직 구현 중이면 true. 로비에 "준비 중" 배지가 표시됩니다 */
  inProgress?: boolean;
}

/** 게임 하나의 최고 점수를 저장할 때 쓰는 공통 키 형식 */
export const highScoreKey = (gameId: string) => `mini-game-platform:${gameId}:high-score`;
