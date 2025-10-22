import { BrowserRouter, Route, Routes } from "react-router-dom"
import CreateRoom from "./pages/CreateRoom"
import LobbyRoom from "./pages/LobbyRoom"
import JoinRoom from "./pages/JoinRoom"
import AuctionRoom from "./pages/AuctionRoom"
import HomePage from "./HomePage"
import ResultPage from "./pages/ResultPage"

const Routers = () => {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/lobby/:roomId" element={<LobbyRoom />} />
        <Route path="/auction/:roomId" element={<AuctionRoom />}  />
        <Route path="/result" element={<ResultPage />} />
    </Routes>
    </BrowserRouter>
  )
}

export default Routers