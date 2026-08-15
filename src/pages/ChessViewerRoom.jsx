import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, ArrowLeft, LayoutGrid, Users } from 'lucide-react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChessViewerRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const roomRef = doc(db, 'chess_tournaments', roomCode);
    const unsubRoom = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        setRoomData(doc.data());
      }
    });

    const playersRef = collection(db, 'chess_tournaments', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      p.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      setPlayers(p);
    });

    const roundsRef = collection(db, 'chess_tournaments', roomCode, 'rounds');
    const unsubRounds = onSnapshot(roundsRef, (snapshot) => {
      const r = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      r.sort((a, b) => b.roundNumber - a.roundNumber); // Latest round first
      setRounds(r);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubRounds();
    };
  }, [roomCode, navigate]);

  if (!roomData) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#050505', color: '#fff' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Trophy size={48} color="#aaa" />
        </motion.div>
      </div>
    );
  }

  // Find the most recent published round
  const activeRound = rounds.find(r => r.status === 'published' || r.status === 'completed');

  return (
    <div style={{ 
      background: '#050505', 
      color: '#ededed', 
      minHeight: '100vh', 
      fontFamily: '"Inter", sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Header */}
      <header style={{ 
        padding: '1.5rem 3rem', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {roomData.logoUrl ? (
              <img src={roomData.logoUrl} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #111, #333)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={24} color="#fff" />
              </div>
            )}
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{roomData.name}</h1>
              <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                Live Broadcast
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Standings Sidebar */}
        <div style={{ 
          width: '350px', 
          borderRight: '1px solid rgba(255,255,255,0.05)', 
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} color="#aaa" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Live Leaderboard</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 1rem 0.5rem', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span>Player</span>
              <span>Points</span>
            </div>
            
            <AnimatePresence>
              {players.map((p, idx) => (
                <motion.div 
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '1rem', 
                    background: idx === 0 ? 'linear-gradient(90deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0) 100%)' : 'rgba(255,255,255,0.03)', 
                    borderRadius: '12px', 
                    marginBottom: '8px',
                    borderLeft: idx === 0 ? '3px solid #ffd700' : idx === 1 ? '3px solid #c0c0c0' : idx === 2 ? '3px solid #cd7f32' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#888', fontSize: '0.9rem', width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: idx === 0 ? '2px solid #ffd700' : '2px solid transparent' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={16} color="#555" />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '140px' }}>
                      <span style={{ fontWeight: '500', fontSize: '1.05rem', color: idx < 3 ? '#fff' : '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      {p.course && <span style={{ fontSize: '0.7rem', color: '#666' }}>{p.course} ({p.year} YR)</span>}
                      {p.designation && <span style={{ fontSize: '0.7rem', color: '#00e5ff' }}>{p.designation}</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>{p.wins || 0}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {players.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '3rem 0' }}>Waiting for players...</div>
            )}
          </div>
        </div>

        {/* Pairings Area */}
        <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
          
          {!activeRound ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <LayoutGrid size={64} style={{ marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '2rem', fontWeight: '300' }}>Waiting for Pairings</h2>
              <p style={{ color: '#888', marginTop: '1rem' }}>The host has not published the first round yet.</p>
            </div>
          ) : (
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ marginBottom: '3rem' }}
              >
                <div style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>Current Matches</div>
                <h2 style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>
                  Round {activeRound.roundNumber}
                </h2>
              </motion.div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
                <AnimatePresence>
                  {activeRound.pairings.map((pairing, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      style={{ 
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        padding: '1.5rem',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600', letterSpacing: '1px' }}>
                          BOARD {idx + 1} {pairing.matchType && <span style={{ color: '#00e5ff', marginLeft: '5px' }}>• {pairing.matchType}</span>}
                        </div>
                        {pairing.result !== 'pending' && (
                          <div style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '4px 10px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            FINISHED
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        
                        {/* Player 1 (White) */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '1rem', 
                          background: pairing.result === '1-0' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)', 
                          borderRadius: '12px',
                          border: pairing.player1Color === 'white' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: pairing.player1Color === 'white' ? '#fff' : '#1a1a1a', border: '2px solid #555' }} />
                            <span style={{ fontWeight: '600', fontSize: '1.2rem', color: pairing.result === '0-1' ? '#666' : '#fff' }}>{pairing.player1Name}</span>
                          </div>
                          {(pairing.result === '1-0' || pairing.result === '0.5-0.5') && (
                            <span style={{ fontWeight: 'bold', color: pairing.result === '1-0' ? '#10b981' : '#888' }}>
                              {pairing.result === '1-0' ? '1' : '½'}
                            </span>
                          )}
                        </div>

                        {/* Player 2 (Black) */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '1rem', 
                          background: pairing.result === '0-1' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)', 
                          borderRadius: '12px',
                          border: pairing.player2Color === 'white' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: pairing.player2Color === 'white' ? '#fff' : '#1a1a1a', border: '2px solid #555' }} />
                            <span style={{ fontWeight: '600', fontSize: '1.2rem', color: pairing.result === '1-0' ? '#666' : '#fff' }}>{pairing.player2Name}</span>
                          </div>
                          {(pairing.result === '0-1' || pairing.result === '0.5-0.5') && (
                            <span style={{ fontWeight: 'bold', color: pairing.result === '0-1' ? '#10b981' : '#888' }}>
                              {pairing.result === '0-1' ? '1' : '½'}
                            </span>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {activeRound.byePlayers && activeRound.byePlayers.map((bp, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '20px', 
                      border: '1px dashed rgba(255,255,255,0.1)', 
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: '#ffd700', fontWeight: '600', letterSpacing: '1px', marginBottom: '1rem' }}>GOLDEN BYE (1 POINT)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{bp.name}</div>
                  </motion.div>
                ))}

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
