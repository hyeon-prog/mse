import { useEffect, useState } from 'react'
import { games } from '../games/gameConfig.js'
import RoomSelector from '../components/RoomSelector.jsx'
import UniversityLogo from '../components/UniversityLogo.jsx'
import { subscribeScores } from '../utils/leaderboard.js'
import { getSelectedUniversity, leaveUniversity, setSelectedUniversity } from '../utils/university.js'

const PERIOD_TABS = [
  { id: 'daily', label: '일간' },
  { id: 'weekly', label: '주간' },
  { id: 'monthly', label: '월간' },
  { id: 'all', label: '전체' },
]

export default function Leaderboard() {
  const [university, setUniversity] = useState(getSelectedUniversity)
  const [activeGameId, setActiveGameId] = useState(games[0]?.id)
  const [activePeriod, setActivePeriod] = useState('all')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!university) return
    setLoading(true)
    setError('')
    const unsubscribe = subscribeScores(
      activeGameId,
      activePeriod,
      university,
      (nextScores) => {
        setScores(nextScores)
        setLoading(false)
      },
      () => {
        setError('랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
      },
    )
    return unsubscribe
  }, [activeGameId, activePeriod, university])

  const handleJoin = (name) => {
    setSelectedUniversity(name)
    setUniversity(name)
  }

  const handleLeave = () => {
    leaveUniversity()
    setUniversity(null)
  }

  if (!university) {
    return (
      <section className="leaderboard">
        <h1>랭킹</h1>
        <RoomSelector onJoin={handleJoin} />
      </section>
    )
  }

  return (
    <section className="leaderboard">
      <div className="leaderboard-room-header">
        <h1>랭킹</h1>
        <div className="leaderboard-room-badge">
          <UniversityLogo name={university} size={22} /> {university}
          <button className="leaderboard-room-leave" onClick={handleLeave}>
            방 변경
          </button>
        </div>
      </div>

      <div className="leaderboard-tabs">
        {games.map((game) => (
          <button
            key={game.id}
            className={'leaderboard-tab' + (game.id === activeGameId ? ' active' : '')}
            onClick={() => setActiveGameId(game.id)}
          >
            {game.icon} {game.name}
          </button>
        ))}
      </div>

      <div className="leaderboard-period-tabs">
        {PERIOD_TABS.map((period) => (
          <button
            key={period.id}
            className={'leaderboard-period-tab' + (period.id === activePeriod ? ' active' : '')}
            onClick={() => setActivePeriod(period.id)}
          >
            {period.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="leaderboard-empty">불러오는 중...</p>
      ) : error ? (
        <p className="leaderboard-empty">{error}</p>
      ) : scores.length === 0 ? (
        <p className="leaderboard-empty">아직 기록이 없습니다. 게임을 플레이해서 첫 기록을 남겨보세요!</p>
      ) : (
        <ol className="leaderboard-list">
          {scores.map((entry, i) => (
            <li key={i} className="leaderboard-row">
              <span className="leaderboard-rank">{i + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-score">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
