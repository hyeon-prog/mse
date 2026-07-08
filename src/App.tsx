import { Route, Routes } from "react-router-dom";
import { Lobby } from "./pages/Lobby";
import { games } from "./gameRegistry";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      {games.map(({ id, Component }) => (
        <Route key={id} path={`/${id}`} element={<Component />} />
      ))}
      <Route path="*" element={<Lobby />} />
    </Routes>
  );
}
