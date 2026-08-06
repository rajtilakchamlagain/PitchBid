import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlayerEntry from './pages/PlayerEntry';
import OwnerEntry from './pages/OwnerEntry';
import AuctionRoom from './pages/AuctionRoom';
import ViewerEntry from './pages/ViewerEntry';
import ViewerRoom from './pages/ViewerRoom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/player-entry" element={<PlayerEntry />} />
          <Route path="/owner-entry" element={<OwnerEntry />} />
          <Route path="/viewer-entry" element={<ViewerEntry />} />
          <Route path="/auction" element={<AuctionRoom />} />
          <Route path="/viewer-room" element={<ViewerRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
