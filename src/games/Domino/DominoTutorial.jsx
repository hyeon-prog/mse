import { useEffect, useState } from 'react'
import DominoTile from './DominoTile.jsx'

const STEPS = [
  { title: '타일이란', caption: '타일 하나에는 두 개의 숫자(점)가 있어요.' },
  { title: '놓는 방법', caption: '체인 끝의 숫자와 같은 쪽을 이어붙여요.' },
  { title: '못 낼 때', caption: '낼 수 없으면 뽑고, 보유고도 없으면 패스해요.' },
  { title: '승리 조건', caption: '손패를 먼저 비우면 승리! 상대에게 남은 타일 숫자를 모두 더한 값이 점수가 돼요.' },
]

function StepVisual({ step }) {
  if (step === 0) {
    return (
      <div className="domino-tutorial-tile-large">
        <span className="domino-tutorial-pip-label left">6</span>
        <DominoTile tile={{ a: 6, b: 4 }} />
        <span className="domino-tutorial-pip-label right">4</span>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="domino-tutorial-step2">
        <div className="domino-tutorial-chain">
          <DominoTile tile={{ a: 3, b: 5 }} />
          <DominoTile tile={{ a: 5, b: 2 }} />
          <span className="domino-tutorial-landing-outline" />
        </div>
        <div className="domino-tutorial-mock-hand">
          <span className="domino-tutorial-phase-label">내 손패</span>
          <div className="domino-tutorial-mock-hand-row">
            <span className="domino-tutorial-ghost-tile" />
            <div className="domino-tutorial-flight-tile">
              <DominoTile tile={{ a: 2, b: 6 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="domino-tutorial-stage-inner">
        <div className="domino-tutorial-phase domino-tutorial-phase-draw">
          <div className="domino-tutorial-pile">
            <DominoTile tile={{ a: 0, b: 0 }} faceDown />
            <DominoTile tile={{ a: 0, b: 0 }} faceDown />
            <DominoTile tile={{ a: 0, b: 0 }} faceDown />
          </div>
          <span className="domino-tutorial-arrow">→</span>
          <div className="domino-tutorial-fly-tile">
            <DominoTile tile={{ a: 1, b: 2 }} />
          </div>
        </div>
        <div className="domino-tutorial-phase domino-tutorial-phase-pass">
          <span className="domino-tutorial-pass-label">패스!</span>
          <span className="domino-tutorial-arrow">➜</span>
          <span className="domino-tutorial-pass-next">다음 사람</span>
        </div>
      </div>
    )
  }

  return (
    <div className="domino-tutorial-stage-inner">
      <div className="domino-tutorial-phase domino-tutorial-phase-empty">
        <span className="domino-tutorial-phase-label">내 손패</span>
        <div className="domino-tutorial-shrinking-hand">
          <DominoTile tile={{ a: 4, b: 1 }} />
          <DominoTile tile={{ a: 0, b: 3 }} />
          <DominoTile tile={{ a: 5, b: 5 }} />
        </div>
        <span className="domino-tutorial-domino-text">도미노!</span>
      </div>
      <div className="domino-tutorial-phase domino-tutorial-phase-score">
        <span className="domino-tutorial-phase-label">상대에게 남은 타일</span>
        <div className="domino-tutorial-loser-hand">
          <div className="domino-tutorial-loser-tile">
            <DominoTile tile={{ a: 4, b: 1 }} />
            <span className="domino-tutorial-tile-sum">5</span>
          </div>
          <span className="domino-tutorial-plus">+</span>
          <div className="domino-tutorial-loser-tile">
            <DominoTile tile={{ a: 0, b: 3 }} />
            <span className="domino-tutorial-tile-sum">3</span>
          </div>
        </div>
        <span className="domino-tutorial-score-badge">= 8점 획득!</span>
      </div>
    </div>
  )
}

export default function DominoTutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="domino-tutorial-overlay" onClick={onClose}>
      <div
        className="domino-tutorial-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="domino-tutorial-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="domino-tutorial-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className="domino-tutorial-dots">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              className={`domino-tutorial-dot ${i === step ? 'active' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`${i + 1}단계: ${s.title}`}
            />
          ))}
        </div>

        <h3 id="domino-tutorial-title" className="domino-tutorial-title">
          {step + 1}. {STEPS[step].title}
        </h3>

        <div className="domino-tutorial-stage" key={step}>
          <StepVisual step={step} />
        </div>

        <p className="domino-tutorial-caption">{STEPS[step].caption}</p>

        <div className="domino-tutorial-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            이전
          </button>
          <button
            className="btn btn-primary"
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
          >
            {isLast ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
