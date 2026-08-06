import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Trophy, Users, Coins, Share2, Copy, CheckCircle2 } from 'lucide-react';

export default function OwnerEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Modes: 'select', 'host', 'share', 'join'
  const [mode, setMode] = useState('select');
  const [copied, setCopied] = useState(false);
  
  // Host Form State
  const [tournamentData, setTournamentData] = useState({
    name: '',
    numOwners: 4,
    budget: 10000
  });
  
  // Generated Room Data
  const [roomCode, setRoomCode] = useState('');
  
  // Join Form State
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      setJoinCode(inviteCode);
      setMode('join');
    }
  }, [searchParams]);

  const handleCreateTournament = () => {
    // Mock room generation
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setMode('share');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/owner-entry?invite=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (joinCode.length >= 4) {
      navigate('/auction');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const renderContent = () => {
    if (mode === 'select') {
      return (
        <div className="animate-fade-in delay-100">
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Owner Access</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn-primary" onClick={() => setMode('host')} style={{ padding: '1rem' }}>
              <Trophy size={20} /> Host a New Tournament
            </button>
            <button className="btn-outline" onClick={() => setMode('join')} style={{ padding: '1rem' }}>
              <Lock size={20} /> Join Existing Tournament
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'host') {
      return (
        <div className="animate-fade-in delay-100" style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>Tournament Setup</h2>
          
          <div className="input-group">
            <label>Tournament Name</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="e.g. Village Premier League"
              value={tournamentData.name}
              onChange={e => setTournamentData({...tournamentData, name: e.target.value})}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Number of Owners</label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Users size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="number" 
                  className="premium-input" 
                  value={tournamentData.numOwners}
                  onChange={e => setTournamentData({...tournamentData, numOwners: e.target.value})}
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>Budget per Team</label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Coins size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="number" 
                  className="premium-input" 
                  value={tournamentData.budget}
                  onChange={e => setTournamentData({...tournamentData, budget: e.target.value})}
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
              </div>
            </div>
          </div>
          
          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }} 
            onClick={handleCreateTournament}
            disabled={!tournamentData.name}
          >
            Generate Room
          </button>
        </div>
      );
    }

    if (mode === 'share') {
      return (
        <div className="animate-fade-in delay-100">
          <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
            <CheckCircle2 size={40} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Room Created!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Share this code with your partner owners.</p>
          
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--primary)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Room Code</p>
            <h1 style={{ fontSize: '3rem', letterSpacing: '0.2em', color: 'var(--text-main)', margin: 0 }}>{roomCode}</h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={handleCopyLink}>
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />} 
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => {
              const text = `Join my auction room on PitchBid! Code: ${roomCode}\nLink: ${window.location.origin}/owner-entry?invite=${roomCode}`;
              navigator.clipboard.writeText(text);
              alert("Invitation text copied to clipboard!");
            }}>
              <Share2 size={18} /> Share Info
            </button>
          </div>
          
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/auction')}>
            Enter Auction Room
          </button>
        </div>
      );
    }

    if (mode === 'join') {
      return (
        <div className="animate-fade-in delay-100">
          <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem' }}>
            <Lock size={40} color="var(--secondary)" />
          </div>
          
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Join Tournament</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Enter the room code provided by the host.</p>
          
          <div className="input-group" style={{ textAlign: 'left' }}>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              style={{ 
                fontSize: '2rem', 
                letterSpacing: '0.3em', 
                textAlign: 'center',
                borderColor: error ? 'red' : 'var(--border-color)',
                textTransform: 'uppercase'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            {error && <span style={{ color: 'red', fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>Invalid Room Code</span>}
          </div>
          
          <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleJoin} disabled={!joinCode}>
            Unlock Podium
          </button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex-center container">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem', textAlign: 'center', position: 'relative' }}>
        <button 
          className="btn-outline" 
          style={{ position: 'absolute', top: '2rem', left: '2rem', padding: '8px 16px', fontSize: '0.9rem', border: 'none' }}
          onClick={() => {
            if (mode === 'select') navigate('/');
            else setMode('select');
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        
        <div style={{ paddingTop: '2rem' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
