import AppleGame from './AppleGame/AppleGame.jsx'
import Game2048 from './Game2048/Game2048.jsx'
import Tetris from './Tetris/Tetris.jsx'
import Minesweeper from './Minesweeper/Minesweeper.jsx'
import AniPang from './AniPang/AniPang.jsx'
import PokemonDodgeball from './PokemonDodgeball/PokemonDodgeball.jsx'
import Tekken from './Tekken/Tekken.jsx'

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
    id: 'pokemon-dodgeball',
    name: '포켓몬피구',
    description: '방향키로 피하고 스페이스바로 던져서 상대를 모두 맞춰보세요.',
    icon: '⚡',
    component: PokemonDodgeball,
  },
  {
    id: 'tekken',
    name: '철권',
    description: '2인 로컬 대전 액션. 펀치와 킥, 막기로 3판 2선승을 노려보세요.',
    icon: '🥋',
    component: Tekken,
  },
]

export const getGameById = (id) => games.find((g) => g.id === id)
