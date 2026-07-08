# 도미노 온라인 멀티플레이 + 랭킹 — 설계 문서

날짜: 2026-07-08

## 배경 / 목표

2~4인 로컬(vs AI) 도미노 위에 온라인 멀티플레이(최대 4인, 실제 사람끼리)와 온라인 매치
기준 글로벌 랭킹을 추가한다. 배포 대상이 GitHub Pages(정적 호스팅)라 별도 서버 없이
Firebase Realtime Database + 익명 인증만으로 구현한다.

이번 설계에서 가장 까다로운 지점은 **손패 프라이버시**다. 대화를 통해 다음으로
확정했다:

- **시작 시 받는 7장 손패**: 방장을 포함해 아무도 못 보게 **완전히 비공개**로 구현한다
  (Firebase 보안 규칙만으로 달성 가능 — 서버/Cloud Functions 불필요).
- **게임 중 보유고에서 뽑는 타일**: 완전히 숨기려면 실제 딜러 서버(Cloud Functions +
  Blaze 유료 요금제)가 필요하다는 점을 설명드렸고, 사용자님이 그 비용/복잡도 대신
  **기존에 합의한 캐주얼 타협(보유고 내용 자체는 기술적으로 열람 가능)을 유지**하기로
  확정했다. 즉 실제 서버 도입 없이 진행한다.

## 왜 이게 어려운가 (설계의 핵심)

일반적인 "이벤트 로그를 모두가 리플레이" 방식은 손패를 공개해야만 성립한다(모두가 같은
로그를 재생하려면 로그에 담긴 정보를 모두 읽을 수 있어야 하니까). 손패를 비공개로
하려면 상태를 **공개 부분**과 **비공개 부분**으로 쪼개야 한다.

- **공개 상태**(`/rooms/{roomId}/public`, 참가자 전원 읽기 가능): 보드, 보유고(합의된
  타협으로 공개), 각자의 **손패 개수**(`handCounts`), 각자의 **손패 핀 합**
  (`pipSums` — 숫자 하나만 공개, 어떤 타일을 들고 있는지는 알 수 없음), 점수, 현재 턴,
  라운드/매치 상태.
- **비공개 상태**(`/rooms/{roomId}/hands/{uid}`, 본인만 읽기 가능): 실제 타일 배열.

`pipSums`를 공개하는 이유: 라운드 종료 시 승자가 "나머지 전원의 핀 합"을 점수로
받는데, 이걸 계산하는 클라이언트(보통 자기 손을 다 낸 사람, 또는 블록을 감지한 사람)가
**남의 실제 타일은 못 읽으므로** 합계 숫자만이라도 공개되어 있어야 점수 계산이
가능하다. 숫자 하나만으로는 상대가 정확히 어떤 타일을 들고 있는지 역산할 수 없어
프라이버시를 크게 해치지 않는다.

**핵심 원칙**: 매 순간 "지금 내 턴인 사람의 클라이언트"만 판단하고 쓴다. 다른 사람의
손패 내용을 몰라도, 자기 턴에는 자기 손패(실제로 읽을 수 있음) + 공개 보드/보유고만
있으면 `canPlay`/`getValidMoves`/`resolveDrawPhase` 등 기존 로컬 엔진 함수를 **그대로**
재사용할 수 있다. 나머지 참가자는 공개 상태가 바뀌는 걸 구독만 하고 있다가 자기
차례에만 같은 방식으로 행동한다.

## 데이터 모델 (Firebase Realtime Database)

```
/rooms/{roomId}
  hostId: string                       # 방장 uid
  status: "waiting" | "playing" | "round-over" | "match-over"
  mode: "single-round" | "target-score"
  targetScore: number
  players: { [uid]: { nickname: string, seat: number } }   # seat 0~3, 0번이 방장
  public: {
    playerOrder: string[]              # uid 좌석 순서 (게임 시작 시 확정)
    board: BoardState                  # 기존 타입 그대로 재사용
    boneyard: Tile[]                   # 합의된 캐주얼 타협 — 내용 공개
    handCounts: { [uid]: number }
    pipSums: { [uid]: number }
    scores: { [uid]: number }
    currentTurn: string
    roundStarter: string
    lastRoundResult: RoundResult | null
    matchWinnerId: string | null
    version: number                    # 낙관적 동시성 체크용 (아래 참고)
  }
  hands: { [uid]: Tile[] }             # 본인만 읽기 가능

/leaderboard/domino/{uid}
  nickname: string
  bestScore: number
  updatedAt: number
```

## 보안 규칙 (`database.rules.json`, 레포 루트에 추가)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        "hostId": { ".write": "auth != null && !data.exists()" },
        "status": { ".write": "auth != null" },
        "mode": { ".write": "auth != null && !data.exists()" },
        "targetScore": { ".write": "auth != null && !data.exists()" },
        "players": {
          "$uid": { ".write": "auth != null && auth.uid === $uid" }
        },
        "public": {
          ".write": "auth != null && (auth.uid === root.child('rooms/' + $roomId + '/hostId').val() || auth.uid === data.child('currentTurn').val())"
        },
        "hands": {
          "$uid": {
            ".read": "auth != null && auth.uid === $uid",
            ".write": "auth != null && (auth.uid === $uid || (auth.uid === root.child('rooms/' + $roomId + '/hostId').val() && root.child('rooms/' + $roomId + '/status').val() === 'waiting'))"
          }
        }
      }
    },
    "leaderboard": {
      "domino": {
        "$uid": { ".write": "auth != null && auth.uid === $uid" }
      }
    }
  }
}
```

`public` 쓰기 규칙이 "현재 턴인 사람 **또는** 방장"을 허용하는 이유: 라운드 종료
직후 다음 라운드를 재분배하는 주체가 방장이고, 그 시점의 `currentTurn`은 직전
라운드가 끝날 때의 값(방장이 아닐 수 있음)이라 방장이 항상 쓸 수 있어야 한다.
방장은 어차피 손패 최초 분배도 담당하는 신뢰된 역할이라 이 정도 권한 확장은
설계상 자연스럽다.

**중요한 한계**: 이 규칙은 이번 대화에서 설계 수준으로 작성한 것이고, 실제 Firebase
프로젝트가 없어 Rules 시뮬레이터로 검증하지 못했다. 특히 `public`을 "현재 턴인
사람만 쓸 수 있다"는 규칙과 `hands`를 "방장이 대기 중에만 쓸 수 있다"는 규칙은 배포
후 사용자님이 Firebase 콘솔의 Rules Playground로 직접 검증해야 한다.

## 동시성 / 안전성

- **공개 상태 쓰기**: `/rooms/{roomId}/public`에 대해 `runTransaction`을 사용한다.
  트랜잭션 콜백이 현재 데이터를 읽어 `version`이 기대한 값과 같은지, `currentTurn`이
  자기 uid인지 확인한 뒤 기존 엔진 함수(`playMove`/`passTurn`)로 계산한 새 공개
  상태를 `version + 1`과 함께 반환한다. 값이 다르면(이미 누가 먼저 썼거나 stale) 콜백이
  `undefined`를 반환해 커밋을 취소한다 — 이것이 "늦게 도착한 중복 액션 무시(멱등
  처리)"의 실제 구현이다.
- **자기 턴이 아니면 애초에 컨트롤 비활성화**(로컬 싱글플레이와 동일한 UI 패턴) +
  보안 규칙이 서버 쪽에서도 다시 한번 막는다(이중 방어).
- **손패 쓰기**는 공개 상태 트랜잭션과 별개의 단순 `set()`이다(본인 경로라 규칙이
  간단). 두 쓰기 사이에 네트워크가 끊기면 손패는 갱신됐는데 공개 상태는 안 바뀐
  상태가 될 수 있다 — 캐주얼 게임 수준에서는 새로고침(재접속) 시 최신 Firebase
  상태로 다시 동기화되는 것으로 충분하다고 보고 더 복잡한 2단계 커밋은 도입하지
  않는다(이번 범위 밖으로 명시).
- **재접속**: Firebase 익명 인증은 같은 브라우저에서 세션이 유지된다(IndexedDB).
  `roomId`만 로컬스토리지 + URL 쿼리에 저장해두면, 새로고침 후 같은 uid로 같은 방을
  다시 구독해서 `players[uid]`가 있으면 그대로 복귀한다. 상태는 항상 Firebase에서
  받아오므로 "복원"을 위한 별도 로직이 필요 없다(Firebase 자체가 단일 진실
  공급원이라 자동으로 해결됨).

## 방 생성/참가/시작 흐름

1. **방 만들기**: 닉네임 입력 → 익명 로그인 → 6자리 코드 생성(충돌 시 재시도) →
   `/rooms/{code}` 생성(`hostId`, `players[uid]={nickname, seat:0}`, `status:"waiting"`).
   링크(`/domino?room=CODE`) 표시.
2. **참가**: 링크 접속 시 방 코드 자동 입력 → 닉네임 입력 → 익명 로그인 →
   `/rooms/{code}/players`에 트랜잭션으로 다음 빈 좌석(0~3) 배정. 방이 없거나 4명
   초과, 이미 시작됐으면 명확한 에러 화면(메뉴로 돌아가기 버튼 포함).
3. **대기실**: 참가자 목록 실시간 표시. 방장에게는 "게임 시작"(2명 이상일 때
   활성화), 다른 참가자에게는 "호스트가 시작하기를 기다리는 중..." 표시.
4. **게임 시작(방장만)**: `playerOrder` 확정(좌석순) → 덱 셔플 → 각자 손패 7장을
   `hands/{uid}`에 개별적으로 씀(방장이 이 순간만 쓰기 가능, 자신도 다시 못 읽음
   — 정직하게 동일 규칙 적용) → `public`(보드 비움, handCounts/pipSums/scores 초기화,
   보유고, currentTurn 등) 기록 → `status: "playing"`.
5. **라운드 종료 후**: 방장에게 "다음 라운드" 버튼, 나머지는 대기 화면. 방장이 누르면
   4번과 동일하게 재분배.
6. **매치 종료**: 전원에게 결과 화면 + 각자 자기 `bestScore`를 `/leaderboard/domino/{내
   uid}`에 조건부로(기존 값보다 높을 때만) 기록.

## UI 컴포넌트

```
src/games/domino/
  multiplayer/
    firebase.ts     # Firebase 앱 초기화, 익명 인증(ensureSignedIn)
    room.ts          # createRoom/joinRoom/subscribeRoom/startGame/sendPublicUpdate/
                       #   startNextRoundOnline/submitLeaderboardScore/subscribeLeaderboard
    types.ts           # RoomState, RoomPlayer 등 온라인 전용 타입
  DominoOnlineSetup.tsx  # 닉네임 입력 + 방 만들기/참가 선택 화면
  DominoLobby.tsx         # 대기실
  DominoLeaderboard.tsx    # 랭킹 화면 ("랭킹 보기"로 메뉴에서 진입)
  DominoErrorBoundary.tsx   # 렌더 에러 바운더리 (클래스 컴포넌트)
```

`Domino.tsx`의 화면 상태머신을 확장한다.

```
menu(싱글/멀티 선택)
 ├─ single-setup(기존) → playing → roundEnd/matchEnd
 └─ online-setup(닉네임+생성/참가)
      → lobby → playing(온라인) → roundEnd/matchEnd → (호스트가 다음 라운드) → ...
```

`index.ts`의 `Component`는 `DominoErrorBoundary`로 감싼다.

## 방어적 UI 상태

명확히 구분되는 화면/배지로 아래를 표시한다(회색 스피너 하나로 뭉뚱그리지 않음).

- 연결 중(익명 인증 진행) / 방 참가 처리 중
- 방 없음 / 방 가득 참 / 이미 시작된 방 (각각 다른 안내 문구 + 메뉴로 돌아가기)
- 라운드 사이 "호스트 대기 중"
- Firebase 구독 오류(네트워크 끊김 등) — 배너로 "연결에 문제가 발생했습니다.
  새로고침해 다시 시도해주세요"
- 렌더링 중 예기치 못한 예외 — `DominoErrorBoundary`가 잡아서 "문제가 발생했습니다 /
  메뉴로 돌아가기" 화면으로 대체(흰 화면 방지)

## 랭킹

- 범위: **온라인 매치 결과만** 반영(싱글플레이 vs AI는 제외 — 기존
  `useHighScore`로 개인 로컬 기록만 유지).
- `/leaderboard/domino/{uid}`에 uid당 한 줄(최고 누적 점수), 닉네임은 마지막으로 그
  점수를 기록할 때 쓴 이름을 표시한다(계정 시스템이 없어 닉네임이 매번 다를 수
  있음 — 캐주얼 게임 한계로 명시).
- `DominoLeaderboard`는 `orderByChild('bestScore').limitToLast(20)`으로 상위 20명을
  구독해 순위/닉네임/점수만 표시한다.

## 필요한 신규 패키지 / 환경 설정

- `firebase` npm 패키지 추가.
- `.env.example` 추가(`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`).
  `.env`는 기존 `.gitignore`에 이미 포함되어 있는지 확인 후 없으면 추가한다.
- README에 Firebase 프로젝트 생성 → 익명 인증 활성화 → Realtime Database 생성 →
  `database.rules.json` 게시 → `.env` 채우기 순서를 안내하는 절 추가.
- 이 작업자는 실제 Firebase 프로젝트를 만들 수 없으므로, 온라인 멀티플레이 종단간
  테스트(방 생성→참가→플레이)는 사용자가 프로젝트 설정 후 직접 확인해야 한다.
  단위 테스트로 검증 가능한 순수 로직(공개 상태 갱신 계산 등)은 이번에도 최대한
  분리해 테스트를 작성한다.

## 범위 밖

- 계정/로그인 시스템(닉네임만 사용, 익명 인증 기반).
- 라운드 중 타임아웃/자동 강퇴(느린 플레이어를 기다리기만 함).
- 관전자 모드, 채팅.
- 보유고 뽑기의 완전한 비공개(딜러 서버 필요 — 이번엔 도입하지 않기로 확정).
