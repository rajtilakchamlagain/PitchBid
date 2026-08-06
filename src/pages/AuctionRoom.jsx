import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Clock, AlertTriangle, Users, Shuffle } from 'lucide-react';
import { doc, getDoc, updateDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function AuctionRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);

  const myTeamName = localStorage.getItem('pitchbid_team');
  const isHost = localStorage.getItem('pitchbid_isHost') === 'true';

  useEffect(() => {
    if (!roomCode || !myTeamName) {
      navigate('/');
      return;
    }

    // Listen to Room Document
    const roomRef = doc(db, 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        
        if (data.activePlayerId) {
          const ap = players.find(p => p.id === data.activePlayerId);
          if (ap) setActivePlayer(ap);
        } else {
          setActivePlayer(null);
        }
      }
    });

    // Listen to Players Collection
    const q = query(collection(db, 'rooms', roomCode, 'players'));
    const unsubPlayers = onSnapshot(q, (snapshot) => {
      const p = [];
      snapshot.forEach(doc => p.push({ id: doc.id, ...doc.data() }));
      setPlayers(p);
      
      if (roomData && roomData.activePlayerId) {
        const ap = p.find(player => player.id === roomData.activePlayerId);
        if (ap) setActivePlayer(ap);
      }
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode, myTeamName, players.length]);

  const handleBid = async (amount) => {
    if (!roomData || !activePlayer) return;
    
    // Calculate my remaining budget dynamically
    const mySpent = players
      .filter(p => p.soldTo === myTeamName && p.status === 'sold')
      .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const myRemaining = roomData.budgetPerTeam - mySpent;

    const newBid = (roomData.currentBid || activePlayer.basePrice || 500) + amount;
    
    if (newBid > myRemaining) {
      alert("Insufficient funds!");
      return;
    }
    
    try {
      await updateDoc(doc(db, 'rooms', roomCode), {
        currentBid: newBid,
        highestBidder: myTeamName,
        timeLeft: 15
      });
    } catch (err) {
      console.error("Error bidding", err);
    }
  };

  const handleSendToBlock = async (playerId) => {
    try {
      await updateDoc(doc(db, 'rooms', roomCode), {
        activePlayerId: playerId,
        currentBid: 0,
        highestBidder: 'None',
        timeLeft: 15
      });
    } catch (err) {
      console.error("Error sending to block", err);
    }
  };

  const handleSendRandomToBlock = () => {
    const pendingPlayers = players.filter(p => p.status === 'pending');
    if (pendingPlayers.length === 0) {
      alert("No pending players left!");
      return;
    }
    const randomIndex = Math.floor(Math.random() * pendingPlayers.length);
    const randomPlayer = pendingPlayers[randomIndex];
    handleSendToBlock(randomPlayer.id);
  };
  
  const handleSellPlayer = async () => {
    if (!activePlayer || roomData.highestBidder === 'None') return;
    try {
      await updateDoc(doc(db, 'rooms', roomCode, 'players', activePlayer.id), {
        status: 'sold',
        soldTo: roomData.highestBidder,
        soldPrice: roomData.currentBid
      });
      await updateDoc(doc(db, 'rooms', roomCode), {
        activePlayerId: null,
        currentBid: 0,
        highestBidder: 'None'
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!roomData) return <div className="min-h-screen flex-center"><h2 className="text-gradient">Loading Room...</h2></div>;

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const soldPlayers = players.filter(p => p.status === 'sold');

  return (
    <div className="min-h-screen" style={{ padding: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-outline" style={{ padding: '8px 16px', border: 'none' }} onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Exit Room
          </button>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Team: <span className="text-gradient">{myTeamName}</span> {isHost && '(Host)'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Room: <strong style={{ color: 'var(--text-main)' }}>{roomCode}</strong></span>
          <div style={{ background: 'rgba(255, 50, 50, 0.2)', padding: '5px 10px', borderRadius: '8px', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', animation: 'pulse 2s infinite' }} />
            LIVE AUCTION
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Left Sidebar: Player Lots */}
        <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            <Users size={18} /> Draft Pool ({pendingPlayers.length})
          </h3>

          {isHost && pendingPlayers.length > 0 && (
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={handleSendRandomToBlock}
            >
              <Shuffle size={16} /> Pick Random
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingPlayers.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No players registered yet.</p> : null}
            {pendingPlayers.map(p => (
              <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                <p style={{ fontWeight: 'bold' }}>{p.realName}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.positions?.join(', ')} • {p.village}</p>
                {isHost && (
                  <button 
                    className="btn-outline" 
                    style={{ width: '100%', marginTop: '10px', padding: '4px', fontSize: '0.8rem' }}
                    onClick={() => handleSendToBlock(p.id)}
                  >
                    Send to Block
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Main Stage */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(180deg, rgba(0,255,136,0.1) 0%, transparent 100%)', zIndex: 0 }} />
          
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', zIndex: 1, marginBottom: '2rem' }}>On The Block</h2>
          
          {activePlayer ? (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', zIndex: 1, width: '100%', padding: '0 2rem' }}>
              <div style={{ width: '200px', height: '280px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={64} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', marginBottom: '0.5rem' }} className="text-gradient">
                  {activePlayer.realName}
                </h1>
                {activePlayer.nickName && (
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                    "{activePlayer.nickName}"
                  </h3>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Positions</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activePlayer.positions?.join(', ')}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Village</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activePlayer.village}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Foot & Age</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activePlayer.foot} • {activePlayer.age}y</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                    <p style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Base Price</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Coins size={16} /> {activePlayer.basePrice || 500}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              <AlertTriangle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>Waiting for Host to send a player to the block...</h3>
            </div>
          )}
        </div>

        {/* Right Sidebar: Bidding Panel & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid var(--secondary)', boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' }}>
            <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem' }}>Current Bid</p>
            <h1 style={{ fontSize: '3.5rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '10px 0' }}>
              <Coins size={30} /> {roomData.currentBid || (activePlayer?.basePrice || 0)}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
              Highest Bidder: <span style={{ fontWeight: 'bold', color: roomData.highestBidder !== 'None' ? 'var(--primary)' : 'var(--text-muted)' }}>{roomData.highestBidder || 'None'}</span>
            </p>
            
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: roomData.timeLeft <= 5 ? '#ff4444' : 'var(--text-main)', fontSize: '1.5rem', fontWeight: 'bold' }}>
              <Clock size={24} /> 00:{roomData.timeLeft < 10 ? `0${roomData.timeLeft || 0}` : (roomData.timeLeft || 15)}
            </div>

            {/* Bid Actions */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '1.5rem' }}>
              <button className="btn-outline" style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }} onClick={() => handleBid(100)} disabled={!activePlayer}>+100</button>
              <button className="btn-outline" style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }} onClick={() => handleBid(500)} disabled={!activePlayer}>+500</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }} onClick={() => handleBid(1000)} disabled={!activePlayer}>+1K</button>
            </div>

            {isHost && (
              <button 
                className="btn-outline" 
                style={{ width: '100%', marginTop: '10px', borderColor: '#ff4444', color: '#ff4444' }}
                onClick={handleSellPlayer}
                disabled={!activePlayer || roomData.highestBidder === 'None'}
              >
                Sell Player (Host)
              </button>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Joined Owners ({roomData.owners?.length || 0}/{roomData.numOwners})</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomData.owners?.map((owner, index) => {
                // Calculate dynamic wallet
                const spent = soldPlayers
                  .filter(p => p.soldTo === owner.name)
                  .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
                const remaining = roomData.budgetPerTeam - spent;
                
                return (
                  <div key={index} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', borderLeft: owner.name === myTeamName ? '3px solid var(--primary)' : '3px solid var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {owner.name} {owner.name === myTeamName && '(You)'}
                      </span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Coins size={14} /> {remaining} left
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                Players Sold Total: <span>{soldPlayers.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
