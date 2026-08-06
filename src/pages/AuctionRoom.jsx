import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Clock, AlertTriangle, Users, Shuffle, CheckCircle2, Info, X } from 'lucide-react';
import { doc, getDoc, updateDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function AuctionRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  const myTeamName = localStorage.getItem('pitchbid_team');
  const isHost = localStorage.getItem('pitchbid_isHost') === 'true';

  useEffect(() => {
    if (!roomCode || !myTeamName) {
      navigate('/');
      return;
    }

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

    const q = query(collection(db, 'rooms', roomCode, 'players'));
    const unsubPlayers = onSnapshot(q, (snapshot) => {
      const p = [];
      snapshot.forEach(d => p.push({ id: d.id, ...d.data() }));
      setPlayers(p);
      roomRef.id;
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode, myTeamName, players.length]);

  // Host Timer Logic
  useEffect(() => {
    if (!isHost || !roomData || !roomData.activePlayerId || roomData.status !== 'live') return;

    const timer = setInterval(() => {
      if (roomData.timeLeft > 0) {
        updateDoc(doc(db, 'rooms', roomCode), {
          timeLeft: roomData.timeLeft - 1
        }).catch(e => {}); 
      } else if (roomData.timeLeft === 0) {
        clearInterval(timer);
        if (roomData.highestBidder === 'None') {
          handleMarkUnsold();
        } else {
          handleSellPlayer();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isHost, roomData?.timeLeft, roomData?.activePlayerId, roomData?.status]);

  useEffect(() => {
    if (roomData && roomData.activePlayerId) {
      const ap = players.find(p => p.id === roomData.activePlayerId);
      if (ap) setActivePlayer(ap);
    } else {
      setActivePlayer(null);
    }
  }, [roomData?.activePlayerId, players]);

  const handleReady = async () => {
    if (!roomData) return;
    const updatedOwners = roomData.owners.map(o => {
      if (o.name === myTeamName) return { ...o, isReady: true };
      return o;
    });
    await updateDoc(doc(db, 'rooms', roomCode), { owners: updatedOwners });
  };

  const handleStartAuction = async () => {
    await updateDoc(doc(db, 'rooms', roomCode), { status: 'live' });
  };

  const handleBid = async () => {
    if (!roomData || !activePlayer || roomData.status !== 'live') return;
    
    const mySpent = players
      .filter(p => p.soldTo === myTeamName && p.status === 'sold')
      .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const myRemaining = roomData.budgetPerTeam - mySpent;

    const current = roomData.currentBid || activePlayer.basePrice || 500;
    const increment = current >= 2000 ? 500 : 100;
    const newBid = current + increment;
    
    if (newBid > myRemaining) {
      alert("Insufficient funds!");
      return;
    }
    
    try {
      await updateDoc(doc(db, 'rooms', roomCode), {
        currentBid: newBid,
        highestBidder: myTeamName,
        timeLeft: 13
      });
    } catch (err) {
      console.error("Error bidding", err);
    }
  };

  const handleSendToBlock = async (playerId) => {
    const p = players.find(x => x.id === playerId);
    try {
      await updateDoc(doc(db, 'rooms', roomCode), {
        activePlayerId: playerId,
        currentBid: p?.basePrice || 500,
        highestBidder: 'None',
        timeLeft: 13
      });
    } catch (err) {
      console.error("Error sending to block", err);
    }
  };

  const handleSendRandomToBlock = () => {
    const pendingPlayers = players.filter(p => p.status === 'pending');
    if (pendingPlayers.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pendingPlayers.length);
    handleSendToBlock(pendingPlayers[randomIndex].id);
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

  const handleMarkUnsold = async () => {
    if (!activePlayer) return;
    try {
      await updateDoc(doc(db, 'rooms', roomCode, 'players', activePlayer.id), {
        status: 'unsold'
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

  const handleRestartUnsoldLot = async () => {
    if (!isHost) return;
    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    if (unsoldPlayers.length === 0) return;

    for (const p of unsoldPlayers) {
      await updateDoc(doc(db, 'rooms', roomCode, 'players', p.id), {
        status: 'pending',
        basePrice: Math.max(100, Math.floor((p.basePrice || 500) / 2))
      });
    }

    const unreadyOwners = roomData.owners.map(o => ({ ...o, isReady: false }));
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'waiting',
      owners: unreadyOwners
    });
  };

  if (!roomData) return <div className="min-h-screen flex-center"><h2 className="text-gradient">Loading Room...</h2></div>;

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const soldPlayers = players.filter(p => p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  const me = roomData.owners?.find(o => o.name === myTeamName);
  const isMyReady = me?.isReady;
  const allOwnersReady = roomData.owners?.every(o => o.isReady) && roomData.owners?.length === roomData.numOwners;

  // ROOM INFO MODAL (For Host)
  const renderRoomInfoModal = () => {
    if (!showRoomInfo) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
          <button onClick={() => setShowRoomInfo(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Room Info & Passwords</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,212,255,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--secondary)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner Code</p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary)', margin: 0 }}>{roomData.ownerCode}</h3>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Owner Slot Passwords</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {roomData.owners?.map((o, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Slot {idx + 1} {o.name ? `(${o.name})` : '(Empty)'}</span>
                    <strong style={{ color: 'var(--text-main)' }}>{o.pass}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(0,255,136,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Player Code</p>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>{roomData.playerCode}</h3>
              </div>
              <div style={{ background: 'rgba(255,0,128,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid #ff0080' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Viewer Code</p>
                <h3 style={{ fontSize: '1.2rem', color: '#ff0080', margin: 0 }}>{roomData.viewerCode}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // LOBBY VIEW
  if (roomData.status === 'waiting') {
    return (
      <div className="min-h-screen flex-center container">
        {renderRoomInfoModal()}
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '3rem', textAlign: 'center', position: 'relative' }}>
          
          {isHost && (
            <button 
              className="btn-outline" 
              onClick={() => setShowRoomInfo(true)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '8px 12px', display: 'flex', gap: '5px', alignItems: 'center' }}
            >
              <Info size={16} /> Room Info
            </button>
          )}

          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }} className="text-gradient">Pre-Auction Lobby</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Waiting for all owners to join and ready up.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
            {roomData.owners?.map((o, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {o.name ? (
                  <>
                    <span style={{ fontWeight: 'bold' }}>{o.name} {o.name === myTeamName && '(You)'}</span>
                    {o.isReady ? <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle2 size={16} /> Ready</span> : <span style={{ color: 'var(--text-muted)' }}>Waiting...</span>}
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty Slot (Slot {idx + 1})</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {!isMyReady && (
              <button className="btn-primary" onClick={handleReady}>
                I Am Ready
              </button>
            )}
            {isHost && (
              <button className="btn-primary" style={{ backgroundImage: 'linear-gradient(135deg, var(--secondary), #00ff88)' }} disabled={!allOwnersReady} onClick={handleStartAuction}>
                Start Auction
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MAIN LIVE VIEW
  const currentIncrement = (roomData.currentBid || (activePlayer?.basePrice || 500)) >= 2000 ? 500 : 100;

  return (
    <div className="min-h-screen" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {renderRoomInfoModal()}
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0, flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-outline" style={{ padding: '8px 16px', border: 'none' }} onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Exit
          </button>
          <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Team: <span className="text-gradient">{myTeamName}</span> {isHost && '(Host)'}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isHost && (
            <button 
              className="btn-outline" 
              onClick={() => setShowRoomInfo(true)}
              style={{ padding: '6px 12px', display: 'flex', gap: '5px', alignItems: 'center', fontSize: '0.8rem' }}
            >
              <Info size={14} /> Room Info
            </button>
          )}

          <div style={{ background: 'rgba(255, 50, 50, 0.2)', padding: '5px 10px', borderRadius: '8px', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', animation: 'pulse 2s infinite' }} />
            LIVE
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* Left Sidebar: Player Lots */}
        <div className="glass-panel" style={{ flex: '1 1 250px', maxWidth: '300px', padding: '1.5rem', overflowY: 'auto' }}>
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

          {isHost && pendingPlayers.length === 0 && unsoldPlayers.length > 0 && !activePlayer && (
            <button 
              className="btn-outline" 
              style={{ width: '100%', marginBottom: '1.5rem', borderColor: '#ff0080', color: '#ff0080' }}
              onClick={handleRestartUnsoldLot}
            >
              Restart Unsold Lot
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingPlayers.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending players.</p> : null}
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
        <div className="glass-panel" style={{ flex: '2 1 400px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(180deg, rgba(0,255,136,0.1) 0%, transparent 100%)', zIndex: 0 }} />
          
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', zIndex: 1, marginBottom: '2rem' }}>On The Block</h2>
          
          {activePlayer ? (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', zIndex: 1, width: '100%', padding: '0 1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ width: '180px', height: '240px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={64} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h1 style={{ fontSize: '3rem', lineHeight: '1.1', marginBottom: '0.5rem' }} className="text-gradient">
                  {activePlayer.realName}
                </h1>
                {activePlayer.nickName && (
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                    "{activePlayer.nickName}"
                  </h3>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Pos</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{activePlayer.positions?.join(', ')}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Village</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{activePlayer.village}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Foot/Age</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{activePlayer.foot} • {activePlayer.age}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                    <p style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Base</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Coins size={14} /> {activePlayer.basePrice || 500}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              <AlertTriangle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>Waiting for Host to send a player...</h3>
            </div>
          )}
        </div>

        {/* Right Sidebar: Bidding Panel & Stats */}
        <div style={{ flex: '1 1 250px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid var(--secondary)', boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' }}>
            <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Current Bid</p>
            <h1 style={{ fontSize: '3rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '10px 0' }}>
              <Coins size={24} /> {roomData.currentBid || (activePlayer?.basePrice || 0)}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Highest Bidder: <br/><strong style={{ color: roomData.highestBidder !== 'None' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '1.2rem' }}>{roomData.highestBidder || 'None'}</strong>
            </p>
            
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: roomData.timeLeft <= 5 ? '#ff4444' : 'var(--text-main)', fontSize: '1.5rem', fontWeight: 'bold' }}>
              <Clock size={24} /> 00:{roomData.timeLeft < 10 ? `0${roomData.timeLeft || 0}` : (roomData.timeLeft || 0)}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px 5px', fontSize: '1rem', fontWeight: 'bold' }} 
                onClick={handleBid} 
                disabled={!activePlayer}
              >
                Place Bid (+{currentIncrement})
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Wallets</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roomData.owners?.map((owner, index) => {
                const spent = soldPlayers
                  .filter(p => p.soldTo === owner.name)
                  .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
                const remaining = roomData.budgetPerTeam - spent;
                
                return (
                  <div key={index} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', borderLeft: owner.name === myTeamName ? '3px solid var(--primary)' : '3px solid var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {owner.name || `Empty Slot ${index + 1}`}
                      </span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Coins size={12} /> {remaining} left
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                Players Sold: <span>{soldPlayers.length}</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: '#ff4444', display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                Unsold Lots: <span>{unsoldPlayers.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
