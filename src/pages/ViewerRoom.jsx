import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Clock, AlertTriangle, Users, MessageCircle, Send } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';

export default function ViewerRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reactions, setReactions] = useState([]);

  const viewerName = localStorage.getItem('pitchbid_viewer') || 'Anonymous Fan';

  // For tracking animations
  const prevBidRef = useRef(0);
  const [pulseBid, setPulseBid] = useState(false);
  const prevActivePlayerRef = useRef(null);
  const [showSoldStamp, setShowSoldStamp] = useState(false);
  const [soldToText, setSoldToText] = useState('');

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const roomRef = doc(db, 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
      }
    });

    const q = query(collection(db, 'rooms', roomCode, 'players'));
    const unsubPlayers = onSnapshot(q, (snapshot) => {
      const p = [];
      snapshot.forEach(d => p.push({ id: d.id, ...d.data() }));
      setPlayers(p);
    });

    const chatQ = query(collection(db, 'rooms', roomCode, 'chat'), orderBy('timestamp', 'asc'));
    const unsubChat = onSnapshot(chatQ, (snapshot) => {
      const msgs = [];
      snapshot.forEach(d => msgs.push({ id: d.id, ...d.data() }));
      setChatMessages(msgs);
    });

    // Listen for reactions
    const reactQ = query(collection(db, 'rooms', roomCode, 'reactions'), orderBy('createdAt', 'desc'), limit(1));
    let initialLoad = true;
    const unsubReactions = onSnapshot(reactQ, (snap) => {
      if (initialLoad) { initialLoad = false; return; }
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const r = change.doc.data();
          const newReaction = { id: change.doc.id, emoji: r.emoji, x: Math.random() * 80 + 10 };
          setReactions(prev => [...prev, newReaction]);
          setTimeout(() => {
            setReactions(prev => prev.filter(x => x.id !== newReaction.id));
          }, 2000);
        }
      });
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubChat();
      unsubReactions();
    };
  }, [roomCode, navigate]);

  useEffect(() => {
    if (roomData) {
      if (roomData.activePlayerId) {
        const ap = players.find(p => p.id === roomData.activePlayerId);
        if (ap) setActivePlayer(ap);
        setShowSoldStamp(false);
      } else {
        if (prevActivePlayerRef.current && roomData.activePlayerId === null && roomData.status === 'live') {
          const justSoldPlayer = players.find(p => p.id === prevActivePlayerRef.current);
          if (justSoldPlayer && justSoldPlayer.status === 'sold') {
             setSoldToText(justSoldPlayer.soldTo);
             setShowSoldStamp(true);
             setTimeout(() => setShowSoldStamp(false), 2000);
          }
        }
        setActivePlayer(null);
      }
      prevActivePlayerRef.current = roomData.activePlayerId;

      if (roomData.currentBid > prevBidRef.current) {
        setPulseBid(true);
        setTimeout(() => setPulseBid(false), 500);
      }
      prevBidRef.current = roomData.currentBid || 0;
    }
  }, [roomData?.activePlayerId, roomData?.currentBid, roomData?.status, players]);


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      await addDoc(collection(db, 'rooms', roomCode, 'chat'), {
        text: newMessage,
        sender: viewerName,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const sendReaction = async (emoji) => {
    await addDoc(collection(db, 'rooms', roomCode, 'reactions'), {
      emoji,
      createdAt: serverTimestamp()
    });
  };

  if (!roomData) return <div className="min-h-screen flex-center"><h2 className="text-gradient pulse-gold">Tuning into Broadcast...</h2></div>;

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const soldPlayers = players.filter(p => p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Reactions Layer */}
      {reactions.map(r => (
        <div key={r.id} className="float-emoji" style={{ left: `${r.x}%` }}>{r.emoji}</div>
      ))}

      {/* SOLD Animation Layer */}
      {showSoldStamp && (
        <div className="stamp-sold">
          SOLD TO<br/>
          <span style={{ fontSize: '2rem', color: '#fff', textShadow: 'none' }}>{soldToText}</span>
        </div>
      )}
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0, padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button className="btn-outline" style={{ padding: '8px 16px', border: 'none', background: 'rgba(255,255,255,0.05)' }} onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Exit
          </button>
          
          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
            Viewing as: <span className="text-gradient-primary" style={{ fontSize: '1.2rem' }}>{viewerName}</span>
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            background: roomData.status === 'live' ? 'rgba(255, 0, 68, 0.15)' : roomData.status === 'break' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 212, 255, 0.15)', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            color: roomData.status === 'live' ? '#ff0044' : roomData.status === 'break' ? '#ffd700' : 'var(--secondary)', 
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', border: `1px solid ${roomData.status === 'live' ? 'rgba(255,0,68,0.3)' : 'rgba(255,255,255,0.1)'}`
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: roomData.status === 'live' ? '#ff0044' : roomData.status === 'break' ? '#ffd700' : 'var(--secondary)', animation: roomData.status === 'live' ? 'pulse 1s infinite' : 'none' }} />
            {roomData.status.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Left Sidebar: Live Chat */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              <MessageCircle size={16} /> Live Chat
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatMessages.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>Be the first to hype up the chat!</p> : null}
            {chatMessages.map(msg => (
              <div key={msg.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold', color: msg.sender === viewerName ? 'var(--secondary)' : 'var(--primary)', fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>
                  {msg.sender}
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>{msg.text}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text"
                className="premium-input"
                placeholder="Send a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                style={{ padding: '10px', fontSize: '0.9rem' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0 15px' }} disabled={!newMessage.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Center: Main Stage / Broadcast View */}
        <div className="glass-panel" style={{ position: 'relative', overflowY: 'auto', overflowX: 'hidden', padding: 0 }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'radial-gradient(circle at 50% 0%, rgba(0, 255, 136, 0.1) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
          
          {roomData.status === 'waiting' || roomData.status === 'break' ? (
            <div className="animate-fade-in" style={{ zIndex: 1, width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                {roomData.status === 'break' ? <Clock size={48} color="#ffd700" /> : <Users size={48} color="var(--primary)" />}
              </div>
              
              <h2 style={{ fontSize: '3rem', marginBottom: '1rem', letterSpacing: '-0.02em', textAlign: 'center' }} className="text-gradient">
                {roomData.status === 'break' ? 'Coffee Break' : 'Awaiting Owners'}
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '400px', textAlign: 'center' }}>
                The broadcast will {roomData.status === 'break' ? 'resume' : 'begin'} once all franchises are ready. Grab some popcorn! 🍿
              </p>
            </div>
          ) : (
            <div style={{ padding: '3rem 2rem', width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>On The Block</h2>
              </div>
              
              {activePlayer ? (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    
                    <div style={{ 
                      width: '220px', height: '300px', borderRadius: '16px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.8) 100%)', 
                      border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative'
                    }}>
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        LOT #{activePlayer.id.substring(0,4)}
                      </div>
                      <Users size={80} color="rgba(255,255,255,0.1)" />
                    </div>

                    <div style={{ flex: 1, minWidth: '300px' }}>
                      {activePlayer.nickName && (
                        <span style={{ fontSize: '1rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 'bold' }}>
                          "{activePlayer.nickName}"
                        </span>
                      )}
                      <h1 style={{ fontSize: '4rem', fontWeight: '900', lineHeight: '1', margin: '0.5rem 0 2rem 0', letterSpacing: '-0.02em' }} className="text-gradient">
                        {activePlayer.realName}
                      </h1>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                        
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Positions</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{activePlayer.positions?.join(', ')}</p>
                        </div>
                        
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Village</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{activePlayer.village}</p>
                        </div>
                        
                        <div style={{ background: 'rgba(0,255,136,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.2)' }}>
                          <p style={{ color: 'var(--primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Base Price</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Coins size={16} color="var(--primary)" /> {activePlayer.basePrice || 500}
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <AlertTriangle size={64} style={{ marginBottom: '1.5rem', opacity: 0.2, color: 'var(--text-muted)' }} />
                  <h3 style={{ color: 'var(--text-muted)', fontWeight: '400', letterSpacing: '0.05em' }}>Awaiting Next Player...</h3>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Bidding Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
          
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(180deg, rgba(30,30,35,0.8) 0%, rgba(20,20,24,0.9) 100%)', position: 'relative' }}>
            <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 'bold' }}>Current Bid</p>
            
            <h1 className={pulseBid ? 'pulse-gold' : ''} style={{ 
              fontSize: '4rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
              margin: '0.5rem 0', fontWeight: '900', letterSpacing: '-0.02em', transition: 'color 0.2s'
            }}>
              <Coins size={32} /> {roomData.currentBid || (activePlayer?.basePrice || 0)}
            </h1>
            
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest Bidder</p>
              <strong style={{ color: roomData.highestBidder !== 'None' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '1.1rem' }}>
                {roomData.highestBidder || 'None'}
              </strong>
            </div>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
              color: roomData.timeLeft <= 5 ? '#ff0044' : 'var(--text-main)', 
              fontSize: '2rem', fontWeight: '900',
              textShadow: roomData.timeLeft <= 5 ? '0 0 20px rgba(255,0,68,0.5)' : 'none'
            }}>
              <Clock size={28} /> 00:{roomData.timeLeft < 10 ? `0${roomData.timeLeft || 0}` : (roomData.timeLeft || 0)}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Franchise Wallets</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomData.owners?.map((owner, index) => {
                const spent = soldPlayers
                  .filter(p => p.soldTo === owner.name)
                  .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
                const remaining = roomData.budgetPerTeam - spent;
                
                return (
                  <div key={index} className="list-item" style={{ borderLeft: '3px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {owner.name || `Team ${index + 1}`}
                        </span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <Coins size={14} /> {remaining} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>left</span>
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Reactions Bar */}
            <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', justifyContent: 'space-around' }}>
               <button onClick={() => sendReaction('🔥')} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>🔥</button>
               <button onClick={() => sendReaction('❤️')} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>❤️</button>
               <button onClick={() => sendReaction('👍')} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>👍</button>
               <button onClick={() => sendReaction('👎')} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>👎</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
