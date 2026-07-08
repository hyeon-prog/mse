import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Lobby from './pages/Lobby.jsx'
import GameList from './pages/GameList.jsx'
import GamePage from './pages/GamePage.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/games" element={<GameList />} />
          <Route path="/games/:gameId" element={<GamePage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>
    </div>
  )
}
