import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Trophy, Users, Coins, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function OwnerEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState('select');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [tournamentData, setTournamentData] = useState({
    name: '',
    numOwners: 4,
    budget: 10000,
    hostTeamName: ''
  });
  
  const [roomCode, setRoomCode] = useState('');
  
  const [joinCode, setJoinCode] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      setJoinCode(inviteCode);
      setMode('join');
    }
  }, [searchParams]);

  const handleCreateTournament = async () => {
    setIsLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const budgetNum = Number(tournamentData.budget);
      // Host automatically becomes the first owner
      const hostOwner = { name: tournamentData.hostTeamName, budget: budgetNum };

      await setDoc(doc(db, 'rooms', code), {
        name: tournamentData.name,
        numOwners: Number(tournamentData.numOwners),
        budgetPerTeam: budgetNum,
        status: 'waiting',
        createdAt: serverTimestamp(),
        activePlayerId: null,
        currentBid: 0,
        highestBidder: 'None',
        timeLeft: 15,
        owners: [hostOwner] // Array to track all joined owners
      });
      
      // Save identity locally
      localStorage.setItem('pitchbid_team', tournamentData.hostTeamName);
      localStorage.setItem('pitchbid_isHost', 'true');
      
      setRoomCode(code);
      setMode('share');
    } catch (err) {
      console.error(err);
      alert("Failed to create tournament. Check database rules.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/owner-entry?invite=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    if (joinCode.length < 4 || !joinTeamName) {
      setError(true);
      setErrorMsg(joinTeamName ? "Code too short" : "Enter a Team Name");
      setTimeout(() => setError(false), 2000);
      return;
    }

    setIsLoading(true);
    try {
      const roomRef = doc(db, 'rooms', joinCode);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        
        // Check if room is full
        if (data.owners && data.owners.length >= data.numOwners) {
          // Allow re-entry if this team name is already in the room
          const isReturningOwner = data.owners.some(o => o.name === joinTeamName);
          if (!isReturningOwner) {
            setError(true);
            setErrorMsg("Room is full! Max owners reached.");
            setTimeout(() => setError(false), 3000);
            setIsLoading(false);
            return;
          }
        }
        
        // Add owner to room if they aren't already in it
        const isReturningOwner = data.owners?.some(o => o.name === joinTeamName);
        if (!isReturningOwner) {
          const newOwnersList = [...(data.owners || []), { name: joinTeamName, budget: data.budgetPerTeam }];
          await updateDoc(roomRef, {
            owners: newOwnersList
          });
        }
        
        // Save identity
        localStorage.setItem('pitchbid_team', joinTeamName);
        localStorage.setItem('pitchbid_isHost', 'false');
        
        navigate(`/auction?room=${joinCode}`);
      } else {
        setError(true);
        setErrorMsg("Room not found");
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      console.error(err);
      setError(true);
      setErrorMsg("Network error");
      setTimeout(() => setError(false), 2000);
    } finally {
      setIsLoading(false);
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
          
          <div className="input-group">
            <label>Your Team Name (Host)</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="e.g. Spartans FC"
              value={tournamentData.hostTeamName}
              onChange={e => setTournamentData({...tournamentData, hostTeamName: e.target.value})}
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
            disabled={!tournamentData.name || !tournamentData.hostTeamName || isLoading}
          >
            {isLoading ? "Generating..." : "Generate Room"}
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
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Share this code with your partner owners and players.</p>
          
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--primary)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Room Code</p>
            <h1 style={{ fontSize: '3rem', letterSpacing: '0.2em', color: 'var(--text-main)', margin: 0 }}>{roomCode}</h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={handleCopyLink}>
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />} 
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
          
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/auction?room=${roomCode}`)}>
            Enter Host Dashboard
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
          
          <div className="input-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label>Your Team Name</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="e.g. Velocity United"
              value={joinTeamName}
              onChange={e => setJoinTeamName(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ textAlign: 'left' }}>
            <label>Room Code</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              style={{ 
                fontSize: '1.5rem', 
                letterSpacing: '0.3em', 
                textAlign: 'center',
                borderColor: error ? 'red' : 'var(--border-color)',
                textTransform: 'uppercase'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            {error && <span style={{ color: 'red', fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center', display: 'block' }}>{errorMsg}</span>}
          </div>
          
          <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleJoin} disabled={!joinCode || !joinTeamName || isLoading}>
            {isLoading ? "Unlocking..." : "Unlock Podium"}
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
