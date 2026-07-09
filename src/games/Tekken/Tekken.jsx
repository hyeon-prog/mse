import { useState } from 'react'
import TekkenLocal from './TekkenLocal.jsx'
import TekkenOnline from './TekkenOnline.jsx'
import './Tekken.css'

function initialRoomCodeFromUrl() {
  return new URLSearchParams(window.location.search).get('troom')?.toUpperCase() ?? ''
}

export default function Tekken() {
  const [mode, setMode] = useState(() => (initialRoomCodeFromUrl() ? 'online' : 'select'))

  const backToSelect = () => {
    setMode('select')
    window.history.replaceState(null, '', window.location.pathname)
  }

  if (mode === 'online') {
    return <TekkenOnline onBack={backToSelect} />
  }

  if (mode === 'local') {
    return <TekkenLocal onBack={backToSelect} />
  }

  return (
    <div className="tekken tekken-select">
      <p>2인 대전 액션. 펀치와 킥, 막기로 3판 2선승을 노려보세요.</p>
      <div className="tekken-option-buttons tekken-start-btn">
        <button className="btn btn-primary" onClick={() => setMode('local')}>
          로컬 대전 (한 기기, 키보드 공유)
        </button>
        <button className="btn btn-secondary" onClick={() => setMode('online')}>
          🌐 온라인 대전 (각자 화면)
        </button>
      </div>
    </div>
  )
}
