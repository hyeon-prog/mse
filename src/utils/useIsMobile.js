import { useEffect, useState } from 'react'

const QUERY = '(hover: none) and (pointer: coarse)'

function detect() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches || window.innerWidth <= 768
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(detect)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const update = () => setIsMobile(detect())
    mql.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mql.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return isMobile
}
