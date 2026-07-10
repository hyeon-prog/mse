import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { games } from '../games/gameConfig.js'
import Button from '../components/Button.jsx'
import RoomSelector from '../components/RoomSelector.jsx'
import UniversityLogo from '../components/UniversityLogo.jsx'
import { completeEmailLinkSignIn, sendVerificationEmail, signOutVerification } from '../utils/emailVerification.js'
import { getSelectedUniversity, isSelectedUniversityVerified, setSelectedUniversity } from '../utils/university.js'

export default function Lobby() {
  const [university, setUniversity] = useState(getSelectedUniversity)
  const [verified, setVerified] = useState(isSelectedUniversityVerified)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [completionMessage, setCompletionMessage] = useState(null)
  const [showManualSelector, setShowManualSelector] = useState(false)

  // 이메일의 인증 링크를 눌러 돌아왔을 때, 시작 페이지에서 인증을 마무리한다.
  useEffect(() => {
    completeEmailLinkSignIn().then((result) => {
      if (!result) return
      if (result.status === 'verified') {
        setUniversity(result.university)
        setVerified(true)
        setCompletionMessage({ type: 'success', text: `${result.university} 이메일 인증이 완료됐어요!` })
      } else if (result.status === 'unknown-domain') {
        setCompletionMessage({
          type: 'warn',
          text: '이메일 인증은 확인했지만 등록된 학교 도메인 목록에는 없어요. 아래에서 학교를 직접 선택해주세요.',
        })
        setShowManualSelector(true)
      } else if (result.status === 'cancelled') {
        setCompletionMessage({ type: 'warn', text: '인증이 취소됐어요. 다시 시도해주세요.' })
      } else if (result.status === 'error') {
        setCompletionMessage({ type: 'error', text: '인증 링크가 만료되었거나 이미 사용됐어요. 다시 시도해주세요.' })
      }
    })
  }, [])

  const handleSendVerification = async (e) => {
    e.preventDefault()
    setSending(true)
    setSendError('')
    try {
      await sendVerificationEmail(email)
      setSent(true)
    } catch (err) {
      setSendError(err.message || '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSending(false)
    }
  }

  const handleManualJoin = (name) => {
    setSelectedUniversity(name, false)
    setUniversity(name)
    setVerified(false)
    setShowManualSelector(false)
  }

  const handleSignOut = async () => {
    await signOutVerification()
    setUniversity(null)
    setVerified(false)
  }

  return (
    <section className="lobby">
      <h1>AltTab에 오신 것을 환영합니다</h1>
      <p className="lobby-subtitle">가볍게 즐기는 미니게임 모음. 게임을 즐기고 랭킹에 도전해보세요!</p>

      <div className="lobby-verify">
        {completionMessage && <p className={`lobby-verify-message ${completionMessage.type}`}>{completionMessage.text}</p>}

        {university ? (
          <div className="lobby-verify-status">
            <UniversityLogo name={university} size={20} />
            <span className="lobby-verify-school">{university}</span>
            <span className={'lobby-verify-badge' + (verified ? ' verified' : '')}>
              {verified ? '✓ 인증됨' : '테스트(미인증)'}
            </span>
            <button type="button" className="lobby-verify-leave" onClick={handleSignOut}>
              학교 변경
            </button>
          </div>
        ) : sent ? (
          <div className="lobby-verify-sent">
            <p>
              <strong>{email}</strong>로 인증 메일을 보냈어요. 메일함에서 링크를 눌러 인증을 완료해주세요.
            </p>
            <button type="button" className="lobby-verify-manual-link" onClick={() => setSent(false)}>
              다른 이메일로 다시 시도
            </button>
          </div>
        ) : (
          <form className="lobby-verify-form" onSubmit={handleSendVerification}>
            <span className="lobby-verify-label">학교 이메일로 인증하고 우리 학교 랭킹에 참여하세요</span>
            <div className="lobby-verify-row">
              <input
                type="email"
                className="lobby-verify-input"
                placeholder="예: student@school.ac.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={sending}>
                {sending ? '보내는 중...' : '인증하기'}
              </button>
            </div>
            {sendError && <p className="lobby-verify-error">{sendError}</p>}
            <button type="button" className="lobby-verify-manual-link" onClick={() => setShowManualSelector((v) => !v)}>
              학교 이메일이 없거나 인증 없이 시작할래요
            </button>
            {showManualSelector && <RoomSelector onJoin={handleManualJoin} />}
          </form>
        )}
      </div>

      <div className="lobby-actions">
        <Link to="/games">
          <Button>게임 목록 보기</Button>
        </Link>
        <Link to="/leaderboard">
          <Button variant="secondary">랭킹 보기</Button>
        </Link>
      </div>

      <div className="lobby-preview">
        {games.map((game) => (
          <Link key={game.id} to={`/games/${game.id}`} className="lobby-card">
            <span className="lobby-card-screen">
              <span className="lobby-card-icon">{game.icon}</span>
            </span>
            <span className="lobby-card-name">{game.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
