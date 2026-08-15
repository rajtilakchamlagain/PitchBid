import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Trophy, Settings, Swords, ArrowRight, Play, CheckCircle2, Shuffle, ArrowLeft } from 'lucide-react';
import { doc, getDoc, collection, query, onSnapshot, updateDoc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function ChessDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(0);
  const [activeTab, setActiveTab] = useState('matchups'); // 'matchups', 'standings', 'settings'
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const roomRef = doc(db, 'chess_tournaments', roomCode);
    const unsubRoom = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRoomData(data);
        setCurrentRoundNumber(data.currentRound || 0);
      }
    });

    const playersRef = collection(db, 'chess_tournaments', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by wins for standings
      p.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      setPlayers(p);
    });

    const roundsRef = collection(db, 'chess_tournaments', roomCode, 'rounds');
    const unsubRounds = onSnapshot(roundsRef, (snapshot) => {
      const r = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      r.sort((a, b) => a.roundNumber - b.roundNumber);
      setRounds(r);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubRounds();
    };
  }, [roomCode, navigate]);

  const generatePairings = async (format) => {
    if (players.length < 2) {
      alert("Need at least 2 players to generate pairings.");
      return;
    }
    setIsGenerating(true);
    
    try {
      const nextRoundNum = currentRoundNumber + 1;
      let pairings = [];
      
      // Shuffle players first to avoid deterministic ties breaking the same way every time
      let pool = [...players].sort(() => Math.random() - 0.5);

      if (format === 'swiss') {
        // Sort by wins descending
        pool.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      } 
      // If knockout, we just use random shuffle (or previous seeding)
      
      while (pool.length >= 2) {
        const p1 = pool.shift();
        const p2 = pool.shift();
        
        // Color balancing logic (simplified)
        let p1Color = 'white';
        let p2Color = 'black';
        
        if (p1.whitePlayed > p1.blackPlayed && p2.blackPlayed >= p2.whitePlayed) {
          p1Color = 'black'; p2Color = 'white';
        }
        
        pairings.push({
          player1: p1.id,
          player1Name: p1.name,
          player1Color: p1Color,
          player2: p2.id,
          player2Name: p2.name,
          player2Color: p2Color,
          result: 'pending' // '1-0', '0-1', '0.5-0.5'
        });
      }

      const hasBye = pool.length === 1;
      let byePlayer = null;
      if (hasBye) {
        byePlayer = pool.shift();
      }

      // Save to Firestore
      const batch = writeBatch(db);
      
      const newRoundRef = doc(collection(db, 'chess_tournaments', roomCode, 'rounds'), `round_${nextRoundNum}`);
      batch.set(newRoundRef, {
        roundNumber: nextRoundNum,
        format,
        pairings,
        byePlayer: byePlayer ? { id: byePlayer.id, name: byePlayer.name } : null,
        status: 'active',
        createdAt: serverTimestamp()
      });

      const roomRef = doc(db, 'chess_tournaments', roomCode);
      batch.update(roomRef, {
        currentRound: nextRoundNum,
        status: 'live'
      });

      // Award 1 point to bye player immediately
      if (byePlayer) {
        const byeRef = doc(db, 'chess_tournaments', roomCode, 'players', byePlayer.id);
        batch.update(byeRef, { wins: (byePlayer.wins || 0) + 1 });
      }

      await batch.commit();

    } catch (err) {
      console.error(err);
      alert("Error generating pairings");
    } finally {
      setIsGenerating(false);
    }
  };

  const reportResult = async (roundId, pairingIndex, result) => {
    try {
      const roundDoc = rounds.find(r => r.id === roundId);
      if (!roundDoc) return;
      
      const pairing = roundDoc.pairings[pairingIndex];
      if (pairing.result !== 'pending') return; // Already reported
      
      const updatedPairings = [...roundDoc.pairings];
      updatedPairings[pairingIndex].result = result;
      
      const batch = writeBatch(db);
      
      // Update round document
      const roundRef = doc(db, 'chess_tournaments', roomCode, 'rounds', roundId);
      batch.update(roundRef, { pairings: updatedPairings });
      
      // Update players scores
      const p1Ref = doc(db, 'chess_tournaments', roomCode, 'players', pairing.player1);
      const p2Ref = doc(db, 'chess_tournaments', roomCode, 'players', pairing.player2);
      
      const p1 = players.find(p => p.id === pairing.player1);
      const p2 = players.find(p => p.id === pairing.player2);
      
      if (result === '1-0') {
        batch.update(p1Ref, { wins: (p1.wins || 0) + 1, whitePlayed: pairing.player1Color === 'white' ? (p1.whitePlayed || 0) + 1 : p1.whitePlayed, blackPlayed: pairing.player1Color === 'black' ? (p1.blackPlayed || 0) + 1 : p1.blackPlayed });
        batch.update(p2Ref, { whitePlayed: pairing.player2Color === 'white' ? (p2.whitePlayed || 0) + 1 : p2.whitePlayed, blackPlayed: pairing.player2Color === 'black' ? (p2.blackPlayed || 0) + 1 : p2.blackPlayed });
      } else if (result === '0-1') {
        batch.update(p2Ref, { wins: (p2.wins || 0) + 1, whitePlayed: pairing.player2Color === 'white' ? (p2.whitePlayed || 0) + 1 : p2.whitePlayed, blackPlayed: pairing.player2Color === 'black' ? (p2.blackPlayed || 0) + 1 : p2.blackPlayed });
        batch.update(p1Ref, { whitePlayed: pairing.player1Color === 'white' ? (p1.whitePlayed || 0) + 1 : p1.whitePlayed, blackPlayed: pairing.player1Color === 'black' ? (p1.blackPlayed || 0) + 1 : p1.blackPlayed });
      } else if (result === '0.5-0.5') {
        batch.update(p1Ref, { wins: (p1.wins || 0) + 0.5, whitePlayed: pairing.player1Color === 'white' ? (p1.whitePlayed || 0) + 1 : p1.whitePlayed, blackPlayed: pairing.player1Color === 'black' ? (p1.blackPlayed || 0) + 1 : p1.blackPlayed });
        batch.update(p2Ref, { wins: (p2.wins || 0) + 0.5, whitePlayed: pairing.player2Color === 'white' ? (p2.whitePlayed || 0) + 1 : p2.whitePlayed, blackPlayed: pairing.player2Color === 'black' ? (p2.blackPlayed || 0) + 1 : p2.blackPlayed });
      }
      
      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Error reporting result");
    }
  };

  if (!roomData) return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Tournament Data...</div>;

  const currentRoundData = rounds.find(r => r.roundNumber === currentRoundNumber);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Sidebar - Players & Standings */}
      <div style={{ width: '320px', background: 'var(--panel-bg)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Exit
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {roomData.logoUrl ? <img src={roomData.logoUrl} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} /> : <Trophy size={32} color="#ff0080" />}
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{roomData.name}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code: {roomData.playerCode}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          <button style={{ flex: 1, padding: '1rem', background: activeTab === 'matchups' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'matchups' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: activeTab === 'matchups' ? 'bold' : 'normal' }} onClick={() => setActiveTab('matchups')}>Matchups</button>
          <button style={{ flex: 1, padding: '1rem', background: activeTab === 'standings' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'standings' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: activeTab === 'standings' ? 'bold' : 'normal' }} onClick={() => setActiveTab('standings')}>Standings</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {activeTab === 'standings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Player</span>
                <span>Pts</span>
              </div>
              {players.map((p, idx) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '20px' }}>{idx + 1}</span>
                    <span style={{ fontWeight: '500' }}>{p.name}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{p.wins || 0}</div>
                </div>
              ))}
              {players.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No players registered yet.</div>}
            </div>
          )}
          {activeTab === 'matchups' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Use the main dashboard to manage active matchups and pairings.</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{currentRoundNumber === 0 ? 'Tournament Lobby' : `Round ${currentRoundNumber}`}</h1>
            <p style={{ color: 'var(--text-muted)' }}>{players.length} Players Registered</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-outline" onClick={() => generatePairings('knockout')} disabled={isGenerating || players.length < 2}>
              <Swords size={18} /> Knockout Pairings
            </button>
            <button className="btn-primary" onClick={() => generatePairings('swiss')} disabled={isGenerating || players.length < 2}>
              <Shuffle size={18} /> Swiss Pairings (Round {currentRoundNumber + 1})
            </button>
          </div>
        </div>

        {/* Current Round Matchups */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {currentRoundNumber === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
              <Trophy size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Waiting to Start</h3>
              <p style={{ color: 'var(--text-muted)' }}>Share the player code <strong>{roomData.playerCode}</strong>. Once players join, generate the first round pairings.</p>
            </div>
          ) : currentRoundData?.pairings?.map((pairing, idx) => (
            <div key={idx} style={{ background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Board {idx + 1}</div>
                {pairing.result !== 'pending' && <div style={{ background: 'var(--success)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>COMPLETED</div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Player 1 (White) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: pairing.player1Color === 'white' ? '4px solid #fff' : '4px solid #333' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: pairing.player1Color === 'white' ? '#fff' : '#333', border: '1px solid #666' }} />
                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{pairing.player1Name}</span>
                  </div>
                  {pairing.result === 'pending' && (
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => reportResult(currentRoundData.id, idx, '1-0')}>1 - 0</button>
                  )}
                </div>

                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>VS</div>

                {/* Player 2 (Black) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: pairing.player2Color === 'white' ? '4px solid #fff' : '4px solid #333' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: pairing.player2Color === 'white' ? '#fff' : '#333', border: '1px solid #666' }} />
                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{pairing.player2Name}</span>
                  </div>
                  {pairing.result === 'pending' && (
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => reportResult(currentRoundData.id, idx, '0-1')}>0 - 1</button>
                  )}
                </div>

              </div>

              {pairing.result === 'pending' && (
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                  <button className="btn-outline" style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }} onClick={() => reportResult(currentRoundData.id, idx, '0.5-0.5')}>Draw ½ - ½</button>
                </div>
              )}

              {pairing.result !== 'pending' && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>
                  Result: {pairing.result}
                </div>
              )}
            </div>
          ))}

          {currentRoundData?.byePlayer && (
            <div style={{ background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Bye (1 Point)</div>
              <h3 style={{ fontSize: '1.2rem' }}>{currentRoundData.byePlayer.name}</h3>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
