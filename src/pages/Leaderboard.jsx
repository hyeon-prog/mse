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

const SCOPE_TABS = [
  { id: 'all', label: '전체 랭킹' },
  { id: 'school', label: '우리 학교' },
]

const DISPLAY_LIMIT = 7

export default function Leaderboard() {
  const [university, setUniversity] = useState(getSelectedUniversity)
  const [showRoomSelector, setShowRoomSelector] = useState(false)
  const [activeGameId, setActiveGameId] = useState(games[0]?.id)
  const [activeDifficulty, setActiveDifficulty] = useState(games[0]?.difficulties?.[0]?.id ?? null)
  const [activePeriod, setActivePeriod] = useState('all')
  const [scope, setScope] = useState('all')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeGame = games.find((g) => g.id === activeGameId)
  const leaderboardGameId = activeGame?.difficulties ? `${activeGame.id}-${activeDifficulty}` : activeGameId

  const handleSelectGame = (game) => {
    setActiveGameId(game.id)
    setActiveDifficulty(game.difficulties?.[0]?.id ?? null)
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    const unsubscribe = subscribeScores(
      leaderboardGameId,
      activePeriod,
      (nextScores) => {
        setScores(nextScores)
        setLoading(false)
      },
      () => {
        setError('랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
      },
      { sortDirection: activeGame?.sortDirection ?? 'desc' },
    )
    return unsubscribe
  }, [leaderboardGameId, activePeriod, activeGame])

  const handleJoin = (name) => {
    setSelectedUniversity(name)
    setUniversity(name)
    setShowRoomSelector(false)
  }

  const handleLeave = () => {
    leaveUniversity()
    setUniversity(null)
  }

  const handleSelectScope = (nextScope) => {
    setScope(nextScope)
    if (nextScope === 'school' && !university) {
      setShowRoomSelector(true)
    }
  }

  const scopedScores = scope === 'school' && university ? scores.filter((entry) => entry.university === university) : scores
  const displayScores = scopedScores.slice(0, DISPLAY_LIMIT)
  const hasMore = scopedScores.length > DISPLAY_LIMIT
  const needsUniversityForSchoolScope = scope === 'school' && !university

  return (
    <section className="leaderboard">
      <div className="leaderboard-room-header">
        <h1>랭킹</h1>
        {university ? (
          <div className="leaderboard-room-badge">
            <UniversityLogo name={university} size={22} /> {university}
            <button className="leaderboard-room-leave" onClick={handleLeave}>
              학교 변경
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => setShowRoomSelector((v) => !v)}>
            학교 설정
          </button>
        )}
      </div>
      <p className="leaderboard-hint">
        내 학교를 설정하면 점수를 등록할 때 학교 이름이 같이 남고, 아래에서 전체 랭킹과 우리 학교 랭킹을 나눠서 볼 수 있어요.
      </p>

      {!university && showRoomSelector && <RoomSelector onJoin={handleJoin} />}

      <div className="leaderboard-scope-tabs">
        {SCOPE_TABS.map((s) => (
          <button
            key={s.id}
            className={'leaderboard-scope-tab' + (s.id === scope ? ' active' : '')}
            onClick={() => handleSelectScope(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="leaderboard-tabs">
        {games.map((game) => (
          <button
            key={game.id}
            className={'leaderboard-tab' + (game.id === activeGameId ? ' active' : '')}
            onClick={() => handleSelectGame(game)}
          >
            {game.icon} {game.name}
          </button>
        ))}
      </div>

      {activeGame?.difficulties && (
        <div className="leaderboard-difficulty-tabs">
          {activeGame.difficulties.map((diff) => (
            <button
              key={diff.id}
              className={'leaderboard-difficulty-tab' + (diff.id === activeDifficulty ? ' active' : '')}
              onClick={() => setActiveDifficulty(diff.id)}
            >
              {diff.label}
            </button>
          ))}
        </div>
      )}

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
      ) : needsUniversityForSchoolScope ? (
        <p className="leaderboard-empty">
          우리 학교 랭킹을 보려면 먼저 학교를 설정해주세요.
        </p>
      ) : scopedScores.length === 0 ? (
        <p className="leaderboard-empty">아직 기록이 없습니다. 게임을 플레이해서 첫 기록을 남겨보세요!</p>
      ) : (
        <ol className="leaderboard-list">
          {displayScores.map((entry, i) => (
            <li key={i} className="leaderboard-row">
              <span className="leaderboard-rank">{i + 1}</span>
              <span className="leaderboard-school">
                {entry.university ? (
                  <>
                    <UniversityLogo name={entry.university} size={16} /> {entry.university}
                  </>
                ) : (
                  '학교 미설정'
                )}
              </span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-score">
                {entry.score}
                {activeGame?.scoreUnit ?? ''}
              </span>
            </li>
          ))}
          {hasMore && (
            <li className="leaderboard-row leaderboard-more">
              <span className="leaderboard-more-dots">···</span>
            </li>
          )}
        </ol>
      )}
    </section>
  )
}
