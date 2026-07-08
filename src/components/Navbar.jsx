import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '로비', end: true },
  { to: '/games', label: '게임 목록' },
  { to: '/leaderboard', label: '랭킹' },
]

export default function Navbar() {
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
      </nav>
    </header>
  )
}
