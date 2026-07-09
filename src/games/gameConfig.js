import AppleGame from './AppleGame/AppleGame.jsx'
import Game2048 from './Game2048/Game2048.jsx'
import Tetris from './Tetris/Tetris.jsx'
import Minesweeper from './Minesweeper/Minesweeper.jsx'
import AniPang from './AniPang/AniPang.jsx'
import AngryBirds from './AngryBirds/AngryBirds.jsx'
import Domino from './Domino/Domino.jsx'
import InfiniteStairs from './InfiniteStairs/InfiniteStairs.jsx'
import WatermelonGame from './WatermelonGame/WatermelonGame.jsx'
import Pinball from './Pinball/Pinball.jsx'

export const games = [
  {
    id: 'apple-game',
    name: '사과게임',
    description: '합이 10이 되는 사과들을 드래그로 선택해서 없애보세요.',
    icon: '🍎',
    component: AppleGame,
  },
  {
    id: '2048',
    name: '2048',
    description: '방향키로 타일을 밀어서 2048을 만들어보세요.',
    icon: '🔢',
    component: Game2048,
  },
  {
    id: 'tetris',
    name: '테트리스',
    description: '블록을 쌓아 줄을 채우고 점수를 획득하세요.',
    icon: '🧱',
    component: Tetris,
  },
  {
    id: 'minesweeper',
    name: '지뢰찾기',
    description: '숫자를 단서로 지뢰를 피해 모든 칸을 열어보세요.',
    icon: '💣',
    component: Minesweeper,
  },
  {
    id: 'anipang',
    name: '애니팡',
    description: '인접한 동물을 맞바꿔 3개 이상 맞추고 제한시간 안에 최고점을 노려보세요.',
    icon: '🐾',
    component: AniPang,
  },
  {
    id: 'angry-birds',
    name: '앵그리버드',
    description: '새를 당겨서 날려 돼지를 맞추고 스테이지를 클리어하세요.',
    icon: '🐦',
    component: AngryBirds,
  },
  {
    id: 'domino',
    name: '도미노',
    description: '더블식스 도미노 28피스로 AI 2~4인전. 숫자를 이어붙여 손패를 먼저 털어내세요.',
    icon: '🁻',
    component: Domino,
  },
  {
    id: 'infinite-stairs',
    name: '무한의 계단',
    description: '다음 계단이 있는 방향으로 박자에 맞춰 ← → 를 눌러 끝없이 올라가보세요.',
    icon: '🪜',
    component: InfiniteStairs,
  },
  {
    id: 'watermelon-game',
    name: '수박게임',
    description: '같은 과일끼리 부딫혀 합치고, 최종 진화체인 수박까지 만들어보세요.',
    icon: '🍉',
    component: WatermelonGame,
  },
  {
    id: 'pinball',
    name: '네온 핀볼',
    description: '플리퍼로 공을 튕겨내며 범퍼·슬링샷·타겟을 맞춰 최대한 오래 살리고 점수를 쌓아보세요.',
    icon: '🕹️',
    component: Pinball,
  },
]

export const getGameById = (id) => games.find((g) => g.id === id)
