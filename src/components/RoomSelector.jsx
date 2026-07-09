import { useEffect, useState } from 'react'
import UniversityLogo from './UniversityLogo.jsx'
import { createRoom, normalize, searchRooms } from '../utils/university.js'

export default function RoomSelector({ onJoin }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    setSearching(true)
    const id = setTimeout(() => {
      searchRooms(trimmed)
        .then((names) => setResults(names))
        .catch(() => setError('검색에 실패했습니다.'))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(id)
  }, [query])

  const hasExactMatch = results.some((name) => normalize(name) === normalize(query))

  const handleJoin = async (name) => {
    setJoining(true)
    setError('')
    try {
      onJoin(name)
    } finally {
      setJoining(false)
    }
  }

  const handleCreate = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setJoining(true)
    setError('')
    try {
      const name = await createRoom(trimmed)
      onJoin(name)
    } catch {
      setError('방 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="room-selector">
      <p className="room-selector-help">학교 이름을 입력해서 방을 검색하거나 새로 만들어보세요.</p>
      <input
        type="text"
        className="room-selector-input"
        placeholder="예: 한국대학교"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={50}
      />

      {error && <p className="room-selector-error">{error}</p>}

      {searching && <p className="room-selector-status">검색 중...</p>}

      {!searching && query.trim() && results.length > 0 && (
        <ul className="room-selector-list">
          {results.map((name) => (
            <li key={name}>
              <button className="btn btn-secondary room-selector-item" onClick={() => handleJoin(name)} disabled={joining}>
                <UniversityLogo name={name} size={18} /> {name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && query.trim() && !hasExactMatch && (
        <button className="btn btn-primary room-selector-create" onClick={handleCreate} disabled={joining}>
          {joining ? '만드는 중...' : `"${query.trim()}" 방 새로 만들기`}
        </button>
      )}
    </div>
  )
}
