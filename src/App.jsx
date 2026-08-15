import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlayerEntry from './pages/PlayerEntry';
import OwnerEntry from './pages/OwnerEntry';
import AuctionRoom from './pages/AuctionRoom';
import ViewerEntry from './pages/ViewerEntry';
import ViewerRoom from './pages/ViewerRoom';
import SquadBuilder from './pages/SquadBuilder';
import ErrorBoundary from './components/ErrorBoundary';

import ChessOwnerEntry from './pages/ChessOwnerEntry';
import ChessPlayerEntry from './pages/ChessPlayerEntry';
import ChessDashboard from './pages/ChessDashboard';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/player-entry" element={<PlayerEntry />} />
            <Route path="/owner-entry" element={<OwnerEntry />} />
            <Route path="/viewer-entry" element={<ViewerEntry />} />
            <Route path="/auction" element={<AuctionRoom />} />
            <Route path="/viewer-room" element={<ViewerRoom />} />
            <Route path="/squad-builder" element={<SquadBuilder />} />
            
            {/* Chess Routes */}
            <Route path="/chess-owner-entry" element={<ChessOwnerEntry />} />
            <Route path="/chess-player-entry" element={<ChessPlayerEntry />} />
            <Route path="/chess-dashboard" element={<ChessDashboard />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
