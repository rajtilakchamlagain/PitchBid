import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, Swords, Shuffle, ArrowLeft, Trash2, Edit2, UserX, CheckCircle2, MoreVertical, ShieldAlert, RotateCcw } from 'lucide-react';
import { doc, collection, onSnapshot, updateDoc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChessDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(0);
  const [activeTab, setActiveTab] = useState('matchups'); 
  const [isGenerating, setIsGenerating] = useState(false);

  // Swap State
  const [swapMode, setSwapMode] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState(null); // { pairingIndex, playerKey (1 or 2) }

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
      p.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      setPlayers(p);
    });

    const roundsRef = collection(db, 'chess_tournaments', roomCode, 'rounds');
    const unsubRounds = onSnapshot(roundsRef, (snapshot) => {
      const r = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      r.sort((a, b) => b.roundNumber - a.roundNumber);
      setRounds(r);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubRounds();
    };
  }, [roomCode, navigate]);

  const generatePairings = async (format) => {
    const activePlayers = players.filter(p => !p.withdrawn);
    if (activePlayers.length < 2) {
      alert("Need at least 2 active players to generate pairings.");
      return;
    }
    
    // Check if there is already a draft
    const existingDraft = rounds.find(r => r.status === 'draft');
    if (existingDraft) {
      alert("There is already an unpublished draft round. Delete or publish it first.");
      return;
    }

    setIsGenerating(true);
    
    try {
      const nextRoundNum = currentRoundNumber + 1;
      let pairings = [];
      
      let pool = [...activePlayers].sort(() => Math.random() - 0.5);

      if (format === 'swiss') {
        pool.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      } 
      
      while (pool.length >= 2) {
        const p1 = pool.shift();
        const p2 = pool.shift();
        
        let p1Color = 'white';
        let p2Color = 'black';
        
        if ((p1.whitePlayed || 0) > (p1.blackPlayed || 0) && (p2.blackPlayed || 0) >= (p2.whitePlayed || 0)) {
          p1Color = 'black'; p2Color = 'white';
        }
        
        pairings.push({
          player1: p1.id,
          player1Name: p1.name,
          player1Color: p1Color,
          player2: p2.id,
          player2Name: p2.name,
          player2Color: p2Color,
          result: 'pending'
        });
      }

      const hasBye = pool.length === 1;
      let byePlayer = null;
      if (hasBye) {
        byePlayer = pool.shift();
      }

      const batch = writeBatch(db);
      const newRoundRef = doc(collection(db, 'chess_tournaments', roomCode, 'rounds'), `round_${nextRoundNum}`);
      
      batch.set(newRoundRef, {
        roundNumber: nextRoundNum,
        format,
        pairings,
        byePlayer: byePlayer ? { id: byePlayer.id, name: byePlayer.name } : null,
        status: 'draft',
        createdAt: serverTimestamp()
      });

      await batch.commit();

    } catch (err) {
      console.error(err);
      alert("Error generating pairings");
    } finally {
      setIsGenerating(false);
    }
  };

  const publishRound = async (roundId, roundNumber, byePlayer) => {
    try {
      const batch = writeBatch(db);
      
      const roundRef = doc(db, 'chess_tournaments', roomCode, 'rounds', roundId);
      batch.update(roundRef, { status: 'published' });
      
      const roomRef = doc(db, 'chess_tournaments', roomCode);
      batch.update(roomRef, {
        currentRound: roundNumber,
        status: 'live'
      });

      if (byePlayer) {
        const pRef = doc(db, 'chess_tournaments', roomCode, 'players', byePlayer.id);
        const playerDoc = players.find(p => p.id === byePlayer.id);
        batch.update(pRef, { wins: (playerDoc.wins || 0) + 1 });
      }

      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Error publishing round.");
    }
  };

  const deleteDraft = async (roundId) => {
    if (!window.confirm("Are you sure you want to delete this drafted round?")) return;
    try {
      await deleteDoc(doc(db, 'chess_tournaments', roomCode, 'rounds', roundId));
    } catch (err) {
      console.error(err);
    }
  };

  const reportResult = async (roundId, pairingIndex, result) => {
    try {
      const roundDoc = rounds.find(r => r.id === roundId);
      if (!roundDoc) return;
      
      const pairing = roundDoc.pairings[pairingIndex];
      if (pairing.result !== 'pending') return; 
      
      const updatedPairings = [...roundDoc.pairings];
      updatedPairings[pairingIndex].result = result;
      
      const batch = writeBatch(db);
      const roundRef = doc(db, 'chess_tournaments', roomCode, 'rounds', roundId);
      batch.update(roundRef, { pairings: updatedPairings });
      
      const p1Ref = doc(db, 'chess_tournaments', roomCode, 'players', pairing.player1);
      const p2Ref = doc(db, 'chess_tournaments', roomCode, 'players', pairing.player2);
      
      const p1 = players.find(p => p.id === pairing.player1);
      const p2 = players.find(p => p.id === pairing.player2);
      
      // Update scores
      if (result === '1-0' || result === '1-0 (Walkover)') {
        batch.update(p1Ref, { 
          wins: (p1.wins || 0) + 1, 
          whitePlayed: pairing.player1Color === 'white' ? (p1.whitePlayed || 0) + 1 : (p1.whitePlayed || 0), 
          blackPlayed: pairing.player1Color === 'black' ? (p1.blackPlayed || 0) + 1 : (p1.blackPlayed || 0) 
        });
        batch.update(p2Ref, { 
          whitePlayed: pairing.player2Color === 'white' ? (p2.whitePlayed || 0) + 1 : (p2.whitePlayed || 0), 
          blackPlayed: pairing.player2Color === 'black' ? (p2.blackPlayed || 0) + 1 : (p2.blackPlayed || 0) 
        });
      } else if (result === '0-1' || result === '0-1 (Walkover)') {
        batch.update(p2Ref, { 
          wins: (p2.wins || 0) + 1, 
          whitePlayed: pairing.player2Color === 'white' ? (p2.whitePlayed || 0) + 1 : (p2.whitePlayed || 0), 
          blackPlayed: pairing.player2Color === 'black' ? (p2.blackPlayed || 0) + 1 : (p2.blackPlayed || 0) 
        });
        batch.update(p1Ref, { 
          whitePlayed: pairing.player1Color === 'white' ? (p1.whitePlayed || 0) + 1 : (p1.whitePlayed || 0), 
          blackPlayed: pairing.player1Color === 'black' ? (p1.blackPlayed || 0) + 1 : (p1.blackPlayed || 0) 
        });
      } else if (result === '0.5-0.5') {
        batch.update(p1Ref, { 
          wins: (p1.wins || 0) + 0.5, 
          whitePlayed: pairing.player1Color === 'white' ? (p1.whitePlayed || 0) + 1 : (p1.whitePlayed || 0), 
          blackPlayed: pairing.player1Color === 'black' ? (p1.blackPlayed || 0) + 1 : (p1.blackPlayed || 0) 
        });
        batch.update(p2Ref, { 
          wins: (p2.wins || 0) + 0.5, 
          whitePlayed: pairing.player2Color === 'white' ? (p2.whitePlayed || 0) + 1 : (p2.whitePlayed || 0), 
          blackPlayed: pairing.player2Color === 'black' ? (p2.blackPlayed || 0) + 1 : (p2.blackPlayed || 0) 
        });
      }
      
      // If walkover, disqualify the loser? (Optional, maybe let owner do it manually via standings)
      
      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Error reporting result");
    }
  };

  const handleSwapClick = async (roundId, pairingIndex, playerNum, playerId, playerName, playerColor) => {
    if (!selectedForSwap) {
      // First click
      setSelectedForSwap({ pairingIndex, playerNum, playerId, playerName, playerColor, roundId });
    } else {
      // Second click
      if (selectedForSwap.roundId !== roundId) {
        alert("Cannot swap across different rounds.");
        setSelectedForSwap(null);
        return;
      }
      if (selectedForSwap.pairingIndex === pairingIndex && selectedForSwap.playerNum === playerNum) {
        // Clicked same player, cancel swap
        setSelectedForSwap(null);
        return;
      }

      const roundDoc = rounds.find(r => r.id === roundId);
      const updatedPairings = [...roundDoc.pairings];

      // Grab both players
      const pA = { id: selectedForSwap.playerId, name: selectedForSwap.playerName };
      const pB = { id: playerId, name: playerName };

      // Overwrite pA slot with pB
      if (selectedForSwap.playerNum === 1) {
        updatedPairings[selectedForSwap.pairingIndex].player1 = pB.id;
        updatedPairings[selectedForSwap.pairingIndex].player1Name = pB.name;
      } else {
        updatedPairings[selectedForSwap.pairingIndex].player2 = pB.id;
        updatedPairings[selectedForSwap.pairingIndex].player2Name = pB.name;
      }

      // Overwrite pB slot with pA
      if (playerNum === 1) {
        updatedPairings[pairingIndex].player1 = pA.id;
        updatedPairings[pairingIndex].player1Name = pA.name;
      } else {
        updatedPairings[pairingIndex].player2 = pA.id;
        updatedPairings[pairingIndex].player2Name = pA.name;
      }

      // Save swap
      try {
        const roundRef = doc(db, 'chess_tournaments', roomCode, 'rounds', roundId);
        await updateDoc(roundRef, { pairings: updatedPairings });
      } catch (err) {
        console.error(err);
        alert("Failed to swap players");
      }

      setSelectedForSwap(null);
      setSwapMode(false);
    }
  };

  const removePlayer = async (playerId, playerName) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${playerName}?`)) return;
    try {
      await deleteDoc(doc(db, 'chess_tournaments', roomCode, 'players', playerId));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDisqualify = async (playerId, playerName, isCurrentlyWithdrawn) => {
    const msg = isCurrentlyWithdrawn 
      ? `Re-enter ${playerName} into the tournament?`
      : `Disqualify/Withdraw ${playerName}? They will not be paired in future rounds.`;
    if (!window.confirm(msg)) return;
    try {
      await updateDoc(doc(db, 'chess_tournaments', roomCode, 'players', playerId), { withdrawn: !isCurrentlyWithdrawn });
    } catch (err) {
      console.error(err);
    }
  };

  const resetTournament = async () => {
    const confirmText = prompt("Are you sure you want to completely RESET the tournament? This will delete all rounds and reset all player scores to 0. Type 'RESET' to confirm.");
    if (confirmText !== 'RESET') return;
    
    try {
      const batch = writeBatch(db);
      
      // Delete all rounds
      rounds.forEach(r => {
        const rRef = doc(db, 'chess_tournaments', roomCode, 'rounds', r.id);
        batch.delete(rRef);
      });
      
      // Reset all players
      players.forEach(p => {
        const pRef = doc(db, 'chess_tournaments', roomCode, 'players', p.id);
        batch.update(pRef, {
          wins: 0,
          whitePlayed: 0,
          blackPlayed: 0,
          matchesPlayed: 0,
          withdrawn: false
        });
      });
      
      // Reset room
      const roomRef = doc(db, 'chess_tournaments', roomCode);
      batch.update(roomRef, {
        currentRound: 0,
        status: 'waiting'
      });
      
      await batch.commit();
      alert("Tournament has been successfully reset.");
    } catch (err) {
      console.error(err);
      alert("Failed to reset tournament.");
    }
  };

  if (!roomData) return <div style={{ background: '#09090b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy color="#333" size={48} /></div>;

  // Top round is either the draft or the highest published round
  const activeRoundData = rounds.length > 0 ? rounds[0] : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#09090b', color: '#ededed', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Sidebar - Players & Standings */}
      <div style={{ width: '340px', background: '#111', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
              <ArrowLeft size={16} /> Exit Dashboard
            </button>
            <button onClick={resetTournament} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }} title="Reset Entire Tournament">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {roomData.logoUrl ? <img src={roomData.logoUrl} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #1f1f1f, #09090b)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}><Trophy size={20} color="#fff" /></div>}
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{roomData.name}</h2>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>Player Code: <span style={{ color: '#fff' }}>{roomData.playerCode}</span></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button style={{ flex: 1, padding: '1rem', background: activeTab === 'matchups' ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', color: activeTab === 'matchups' ? '#fff' : '#888', cursor: 'pointer', fontWeight: activeTab === 'matchups' ? 'bold' : 'normal' }} onClick={() => setActiveTab('matchups')}>Host Controls</button>
          <button style={{ flex: 1, padding: '1rem', background: activeTab === 'standings' ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', color: activeTab === 'standings' ? '#fff' : '#888', cursor: 'pointer', fontWeight: activeTab === 'standings' ? 'bold' : 'normal' }} onClick={() => setActiveTab('standings')}>Manage Players</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {activeTab === 'standings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 8px', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <span>Player</span>
                <span>Pts</span>
              </div>
              <AnimatePresence>
                {players.map((p, idx) => (
                  <motion.div key={p.id} layout style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: p.withdrawn ? 'rgba(255,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', opacity: p.withdrawn ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#666', fontSize: '0.85rem', width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500', color: p.withdrawn ? '#888' : '#fff' }}>{p.name} {p.withdrawn && '(WD)'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{p.wins || 0}</div>
                      
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => toggleDisqualify(p.id, p.name, p.withdrawn)} style={{ background: 'none', border: 'none', color: p.withdrawn ? '#10b981' : '#ff9900', cursor: 'pointer', padding: '4px' }} title={p.withdrawn ? "Re-enter" : "Withdraw / Disqualify"}>
                          {p.withdrawn ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                        </button>
                        <button onClick={() => removePlayer(p.id, p.name)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }} title="Delete completely">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {activeTab === 'matchups' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.5' }}>This is the central host dashboard. Use the main area to generate rounds, edit pairings in Draft Mode, and report results.</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Top Control Bar */}
        <div style={{ padding: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
              {activeRoundData ? (activeRoundData.status === 'draft' ? `Draft: Round ${activeRoundData.roundNumber}` : `Round ${activeRoundData.roundNumber}`) : 'Tournament Lobby'}
              {activeRoundData?.status === 'draft' && <span style={{ fontSize: '0.9rem', background: '#ff9900', color: '#000', padding: '4px 10px', borderRadius: '30px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Draft Mode</span>}
            </h1>
            <p style={{ color: '#888' }}>{players.length} Total Players ({players.filter(p=>!p.withdrawn).length} Active)</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => generatePairings('knockout')} 
                disabled={isGenerating || players.filter(p=>!p.withdrawn).length < 2 || activeRoundData?.status === 'draft'}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', opacity: (isGenerating || activeRoundData?.status === 'draft') ? 0.5 : 1 }}
              >
                <Swords size={18} /> Knockout Pairings
              </button>
              
              <button 
                onClick={() => generatePairings('swiss')} 
                disabled={isGenerating || players.filter(p=>!p.withdrawn).length < 2 || activeRoundData?.status === 'draft'}
                style={{ background: '#fff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', opacity: (isGenerating || activeRoundData?.status === 'draft') ? 0.5 : 1 }}
              >
                <Shuffle size={18} /> Swiss Pairings (Round {currentRoundNumber + 1})
              </button>
            </div>
            {players.filter(p=>!p.withdrawn).length < 2 && <span style={{ color: '#ff4444', fontSize: '0.85rem' }}>* Need at least 2 active players</span>}
            {activeRoundData?.status === 'draft' && <span style={{ color: '#ff9900', fontSize: '0.85rem' }}>* Publish or delete the draft first</span>}
          </div>
        </div>

        {/* Current Round Actions Bar (Only if draft) */}
        {activeRoundData && activeRoundData.status === 'draft' && (
          <div style={{ background: 'rgba(255,153,0,0.05)', borderBottom: '1px solid rgba(255,153,0,0.2)', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#ff9900' }}>Review Pairings</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>These pairings are hidden from viewers. You can edit them now. When ready, publish the round.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setSwapMode(!swapMode)} style={{ background: swapMode ? '#ff9900' : 'transparent', color: swapMode ? '#000' : '#ff9900', border: '1px solid #ff9900', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} /> {swapMode ? 'Cancel Swap' : 'Swap Players'}
              </button>
              <button onClick={() => deleteDraft(activeRoundData.id)} style={{ background: 'transparent', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Delete Draft
              </button>
              <button onClick={() => publishRound(activeRoundData.id, activeRoundData.roundNumber, activeRoundData.byePlayer)} style={{ background: '#10b981', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Publish Round
              </button>
            </div>
          </div>
        )}

        {/* Matchups Grid */}
        <div style={{ padding: '3rem', flex: 1 }}>
          {activeRoundData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '2rem' }}>
              
              {activeRoundData.pairings.map((pairing, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  padding: '1.5rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', letterSpacing: '2px' }}>BOARD {idx + 1}</div>
                    {pairing.result !== 'pending' && <div style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>COMPLETED</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Player 1 (White) */}
                    <div 
                      onClick={() => swapMode && handleSwapClick(activeRoundData.id, idx, 1, pairing.player1, pairing.player1Name, pairing.player1Color)}
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', 
                        background: 'rgba(255,255,255,0.03)', borderRadius: '12px', 
                        borderLeft: pairing.player1Color === 'white' ? '4px solid #fff' : '4px solid #333',
                        border: selectedForSwap?.pairingIndex === idx && selectedForSwap?.playerNum === 1 ? '1px solid #ff9900' : '1px solid transparent',
                        cursor: swapMode ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: pairing.player1Color === 'white' ? '#fff' : '#333' }} />
                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{pairing.player1Name}</span>
                      </div>
                      {pairing.result === 'pending' && !swapMode && activeRoundData.status === 'published' && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                           <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => reportResult(activeRoundData.id, idx, '1-0')}>Won</button>
                           <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => reportResult(activeRoundData.id, idx, '1-0 (Walkover)')} title="Walkover (Opponent Absent)">WO</button>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', fontWeight: 'bold' }}>VS</div>

                    {/* Player 2 (Black) */}
                    <div 
                      onClick={() => swapMode && handleSwapClick(activeRoundData.id, idx, 2, pairing.player2, pairing.player2Name, pairing.player2Color)}
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', 
                        background: 'rgba(255,255,255,0.03)', borderRadius: '12px', 
                        borderLeft: pairing.player2Color === 'white' ? '4px solid #fff' : '4px solid #333',
                        border: selectedForSwap?.pairingIndex === idx && selectedForSwap?.playerNum === 2 ? '1px solid #ff9900' : '1px solid transparent',
                        cursor: swapMode ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: pairing.player2Color === 'white' ? '#fff' : '#333' }} />
                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{pairing.player2Name}</span>
                      </div>
                      {pairing.result === 'pending' && !swapMode && activeRoundData.status === 'published' && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                           <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => reportResult(activeRoundData.id, idx, '0-1')}>Won</button>
                           <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => reportResult(activeRoundData.id, idx, '0-1 (Walkover)')} title="Walkover (Opponent Absent)">WO</button>
                        </div>
                      )}
                    </div>

                  </div>

                  {pairing.result === 'pending' && !swapMode && activeRoundData.status === 'published' && (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <button style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '8px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => reportResult(activeRoundData.id, idx, '0.5-0.5')}>Draw ½ - ½</button>
                    </div>
                  )}

                  {pairing.result !== 'pending' && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>
                      Result: <span style={{ color: '#10b981' }}>{pairing.result}</span>
                    </div>
                  )}
                </div>
              ))}

              {activeRoundData.byePlayer && (
                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '1rem' }}>BYE (1 POINT)</div>
                  <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{activeRoundData.byePlayer.name}</h3>
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <Trophy size={64} style={{ marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '2rem', fontWeight: '300' }}>Waiting to Start</h2>
              <p style={{ color: '#888', marginTop: '1rem' }}>Share the player code {roomData.playerCode}. Once players join, generate the first round.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
