import { useEffect, useRef } from 'react'
import './Pinball.css'

const PINBALL_SRC = `${import.meta.env.BASE_URL}games/pinball/index.html`

export default function Pinball() {
  const iframeRef = useRef(null)

  useEffect(() => {
    iframeRef.current?.focus()
  }, [])

  return (
    <div className="pinball-game">
      <div className="pinball-frame-wrap" onPointerDown={() => iframeRef.current?.focus()}>
        <iframe ref={iframeRef} src={PINBALL_SRC} className="pinball-frame" title="네온 핀볼" />
      </div>
      <p className="pinball-help">
        ← / Z: 왼쪽 플리퍼, → / /(슬래시): 오른쪽 플리퍼, 스페이스바를 누르고 있다가 떼면 발사됩니다. 모바일은 화면
        하단의 좌/우 플리퍼 버튼과 중앙 발사 버튼을 사용하세요.
      </p>
    </div>
  )
}
