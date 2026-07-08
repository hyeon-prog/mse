import AppleGame from './AppleGame/AppleGame.jsx'
import Game2048 from './Game2048/Game2048.jsx'
import Tetris from './Tetris/Tetris.jsx'
import Minesweeper from './Minesweeper/Minesweeper.jsx'

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
]

export const getGameById = (id) => games.find((g) => g.id === id)
