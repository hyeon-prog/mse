import { useEffect, useState } from 'react'
import { getUniversityDomain } from '../utils/universityLogos.js'

// 학교 이름 → 공식 도메인이 매핑된 경우에만 로고를 시도해서 보여준다.
// 구글 파비콘 서비스(키/가입 불필요, 공개 엔드포인트)로 그 학교 공식
// 사이트의 아이콘을 가져온다. 매핑이 없거나 이미지 로드에 실패하면
// 이모지로 대체한다.
export default function UniversityLogo({ name, size = 20, className = '' }) {
  const domain = getUniversityDomain(name)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [domain])

  if (!domain || failed) {
    return (
      <span className={`university-logo-fallback ${className}`} aria-hidden="true">
        🏫
      </span>
    )
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
      alt=""
      width={size}
      height={size}
      className={`university-logo ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
