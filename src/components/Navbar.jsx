import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { isMuted, toggleMuted } from '../utils/sound.js'

const links = [
  { to: '/', label: '로비', end: true },
  { to: '/games', label: '게임 목록' },
  { to: '/leaderboard', label: '랭킹' },
]

export default function Navbar() {
  const [muted, setMutedState] = useState(isMuted)

  const handleToggleMute = () => {
    setMutedState(toggleMuted())
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand" end>
        🎮 미니게임 플랫폼
      </NavLink>
      <nav className="navbar-links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
          >
            {link.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="navbar-mute"
          onClick={handleToggleMute}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          title={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </nav>
    </header>
  )
}
