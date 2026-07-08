# 담당: 사과게임

이 폴더 안의 파일만 수정하면 됩니다. 다른 팀원의 폴더나 `src/App.tsx`,
`src/gameRegistry.ts` 등은 건드리지 않아도 로비 화면에 자동으로 반영돼요.

## 파일 구성

- `AppleGame.tsx` — 게임 로직 + 렌더링. 실제로 채워야 할 부분입니다.
- `AppleGame.css` — 보드/사과 스타일.
- `index.ts` — 로비에 표시될 제목/설명/아이콘 정보. `inProgress: true`는
  구현이 끝나면 지워주세요.

## 이미 준비되어 있는 것

- 10x17 보드에 1~9 무작위 숫자가 채워진 초기 상태
- 드래그 시작/끝 좌표(`dragStart`, `dragEnd`)를 추적하는 마우스 이벤트
- 드래그 사각형 범위 안의 셀 목록(`selectedCells`)과 그 합(`selectedSum`)
  자동 계산
- 120초 카운트다운 타이머

## 해야 할 일 (`AppleGame.tsx` 안의 `TODO(apple)` 참고)

`handleMouseUp` 함수 안에서:

1. `selectedSum === 10` 인지 확인
2. 맞다면 `selectedCells`에 해당하는 셀들을 `board`에서 `cleared: true`로
   변경하고, `setScore`로 점수 올리기 (예: 제거한 사과 개수만큼)
3. 합이 10이 아니면 아무 것도 하지 않음 (드래그 선택은 자동으로 풀림)

추가로 원하면:

- 남은 사과로 10을 만들 수 없을 때 "더 이상 조합 없음" 안내
- 시간 종료 시 재시작 버튼
- 콤보/연쇄 보너스 점수

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `/apple-game` 경로로 바로 이동해 확인할 수 있습니다.
