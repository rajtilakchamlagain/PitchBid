import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlayerEntry from './pages/PlayerEntry';
import OwnerEntry from './pages/OwnerEntry';
import AuctionRoom from './pages/AuctionRoom';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/player-entry" element={<PlayerEntry />} />
          <Route path="/owner-entry" element={<OwnerEntry />} />
          <Route path="/auction" element={<AuctionRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
