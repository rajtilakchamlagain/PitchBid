import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Trophy, Users, Coins, Copy, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, getDocs, updateDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function OwnerEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState('select');
  const [copiedCode, setCopiedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [tournamentData, setTournamentData] = useState({
    name: '',
    numOwners: 4,
    budget: 10000,
    hostTeamName: ''
  });
  
  const [generatedCodes, setGeneratedCodes] = useState({ owner: '', player: '', viewer: '' });
  
  const [joinCode, setJoinCode] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // A quick one-time migration hook to fix PF52HZ (requested by user)
  useEffect(() => {
    const runMigration = async () => {
      try {
        const roomRef = doc(db, 'rooms', 'PF52HZ');
        const snap = await getDocs(query(collection(db, 'rooms'), where('ownerCode', '==', 'PF52HZ')));
        if (snap.empty) {
          // If we haven't migrated PF52HZ yet, do it
          const randPlayer = Math.random().toString(36).substring(2, 8).toUpperCase();
          const randViewer = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(roomRef, {
            ownerCode: 'PF52HZ',
            playerCode: randPlayer,
            viewerCode: randViewer,
            status: 'waiting'
          }).catch(e => console.log('Migration skip: ', e)); // ignore if doesn't exist
        }
      } catch(e) { }
    };
    runMigration();
  }, []);

  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      setJoinCode(inviteCode);
      setMode('join');
    }
  }, [searchParams]);

  const handleCreateTournament = async () => {
    setIsLoading(true);
    const ownerCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const playerCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const viewerCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const budgetNum = Number(tournamentData.budget);
      const hostOwner = { name: tournamentData.hostTeamName, budget: budgetNum, isReady: false };

      await setDoc(doc(db, 'rooms', ownerCode), {
        name: tournamentData.name,
        numOwners: Number(tournamentData.numOwners),
        budgetPerTeam: budgetNum,
        status: 'waiting',
        createdAt: serverTimestamp(),
        activePlayerId: null,
        currentBid: 0,
        highestBidder: 'None',
        timeLeft: 15,
        ownerCode,
        playerCode,
        viewerCode,
        owners: [hostOwner]
      });
      
      localStorage.setItem('pitchbid_team', tournamentData.hostTeamName);
      localStorage.setItem('pitchbid_isHost', 'true');
      
      setGeneratedCodes({ owner: ownerCode, player: playerCode, viewer: viewerCode });
      setMode('share');
    } catch (err) {
      console.error(err);
      alert("Failed to create tournament. Check database rules.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(''), 2000);
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
      const q = query(collection(db, 'rooms'), where('ownerCode', '==', joinCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const roomDoc = snap.docs[0];
        const data = roomDoc.data();
        
        if (data.owners && data.owners.length >= data.numOwners) {
          const isReturningOwner = data.owners.some(o => o.name === joinTeamName);
          if (!isReturningOwner) {
            setError(true);
            setErrorMsg("Room is full! Max owners reached.");
            setTimeout(() => setError(false), 3000);
            setIsLoading(false);
            return;
          }
        }
        
        const isReturningOwner = data.owners?.some(o => o.name === joinTeamName);
        if (!isReturningOwner) {
          const newOwnersList = [...(data.owners || []), { name: joinTeamName, budget: data.budgetPerTeam, isReady: false }];
          await updateDoc(doc(db, 'rooms', roomDoc.id), {
            owners: newOwnersList
          });
        }
        
        localStorage.setItem('pitchbid_team', joinTeamName);
        localStorage.setItem('pitchbid_isHost', 'false');
        
        navigate(`/auction?room=${roomDoc.id}`);
      } else {
        setError(true);
        setErrorMsg("Tournament not found");
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
            {isLoading ? "Generating..." : "Generate Codes"}
          </button>
        </div>
      );
    }

    if (mode === 'share') {
      return (
        <div className="animate-fade-in delay-100 text-left">
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '1rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
              <CheckCircle2 size={32} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Tournament Created!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Share these specific codes.</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Owner Code */}
            <div style={{ background: 'rgba(0,212,255,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>For Partner Owners</p>
                <h3 style={{ fontSize: '1.5rem', letterSpacing: '0.1em', color: 'var(--secondary)', margin: 0 }}>{generatedCodes.owner}</h3>
              </div>
              <button className="btn-outline" style={{ padding: '8px' }} onClick={() => handleCopy(generatedCodes.owner, 'owner')}>
                {copiedCode === 'owner' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {/* Player Code */}
            <div style={{ background: 'rgba(0,255,136,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>For Players (Registration)</p>
                <h3 style={{ fontSize: '1.5rem', letterSpacing: '0.1em', color: 'var(--primary)', margin: 0 }}>{generatedCodes.player}</h3>
              </div>
              <button className="btn-outline" style={{ padding: '8px' }} onClick={() => handleCopy(generatedCodes.player, 'player')}>
                {copiedCode === 'player' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {/* Viewer Code */}
            <div style={{ background: 'rgba(255,0,128,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid #ff0080', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>For Live Viewers</p>
                <h3 style={{ fontSize: '1.5rem', letterSpacing: '0.1em', color: '#ff0080', margin: 0 }}>{generatedCodes.viewer}</h3>
              </div>
              <button className="btn-outline" style={{ padding: '8px' }} onClick={() => handleCopy(generatedCodes.viewer, 'viewer')}>
                {copiedCode === 'viewer' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/auction?room=${generatedCodes.owner}`)}>
            Enter Pre-Auction Lobby
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
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Enter the Owner code provided by the host.</p>
          
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
            <label>Owner Code</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="OWNER CODE"
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
            {error && <span style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', display: 'block' }}>{errorMsg}</span>}
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
        <button 
          className="btn-outline" 
          style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
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
