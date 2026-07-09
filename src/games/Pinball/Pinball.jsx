import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import './Pinball.css'

const PINBALL_SRC = `${import.meta.env.BASE_URL}games/pinball/index.html`

export default function Pinball() {
  const iframeRef = useRef(null)
  const [gameOverScore, setGameOverScore] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    iframeRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.source !== 'neon-pinball') return
      if (e.data.type === 'gameover') {
        setGameOverScore(e.data.score)
        setPlayerName('')
        setSaveError('')
        setSaved(false)
      } else if (e.data.type === 'start') {
        setGameOverScore(null)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('pinball', playerName, gameOverScore)
      setSaved(true)
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pinball-game">
      <div className="pinball-frame-wrap" onPointerDown={() => iframeRef.current?.focus()}>
        <iframe ref={iframeRef} src={PINBALL_SRC} className="pinball-frame" title="네온 핀볼" />
      </div>

      {gameOverScore != null && (
        <div className="pinball-score-panel">
          <p>
            최종 점수: <strong>{gameOverScore}</strong>
          </p>
          {saved ? (
            <p className="pinball-saved">기록이 저장되었습니다!</p>
          ) : (
            <>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="pinball-error">{saveError}</p>}
              <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                {saving ? '저장 중...' : '기록 저장'}
              </button>
            </>
          )}
          <p className="pinball-score-panel-hint">iframe 안의 '다시하기' 버튼을 누르면 새 게임을 시작할 수 있어요.</p>
        </div>
      )}

      <p className="pinball-help">
        ← / Z: 왼쪽 플리퍼, → / /(슬래시): 오른쪽 플리퍼, 스페이스바를 누르고 있다가 떼면 발사됩니다. 모바일은 화면
        하단의 좌/우 플리퍼 버튼과 중앙 발사 버튼을 사용하세요.
      </p>
    </div>
  )
}
