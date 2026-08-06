import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Users, Send } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function ViewerRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const myNickname = localStorage.getItem('pitchbid_viewer_name') || 'Anonymous';
  
  const [roomData, setRoomData] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    // Listen to Room Document
    const roomRef = doc(db, 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoomData(docSnap.data());
      }
    });

    // Listen to Players Collection for active player
    const qPlayers = query(collection(db, 'rooms', roomCode, 'players'));
    const unsubPlayers = onSnapshot(qPlayers, (snapshot) => {
      const p = [];
      snapshot.forEach(d => p.push({ id: d.id, ...d.data() }));
      
      // Update active player if it changed
      roomRef.id // just to trigger re-eval if needed, but we rely on roomData state in next hook
      // Actually, since we need roomData.activePlayerId, we'll just handle it below
      // Wait, we can't access state reliably here. We'll set a ref or just fetch the active player specifically.
      // Better yet, just find the active player from the list:
      const activeP = p.find(player => player.id === (docSnap?.data()?.activePlayerId || null));
      if (activeP) setActivePlayer(activeP);
    });

    // Listen to Chat Messages
    const qMessages = query(collection(db, 'rooms', roomCode, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const m = [];
      snapshot.forEach(d => m.push({ id: d.id, ...d.data() }));
      setMessages(m);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubMessages();
    };
  }, [roomCode]);

  // Handle syncing active player when roomData updates
  useEffect(() => {
    if (roomData && roomData.activePlayerId) {
      // Just re-trigger the players listener or rely on it
      // For viewer, we can just do a one-off fetch if needed, but onSnapshot handles it mostly.
    } else {
      setActivePlayer(null);
    }
  }, [roomData?.activePlayerId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    try {
      await addDoc(collection(db, 'rooms', roomCode, 'messages'), {
        sender: myNickname,
        text: chatInput.trim(),
        createdAt: serverTimestamp()
      });
      setChatInput('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!roomData) return <div className="min-h-screen flex-center"><h2 className="text-gradient">Loading Stream...</h2></div>;

  return (
    <div className="min-h-screen" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-outline" style={{ padding: '8px 16px', border: 'none' }} onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Exit Stream
          </button>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Viewing as: <span style={{ color: '#ff0080' }}>{myNickname}</span></span>
        </div>
        <div style={{ background: 'rgba(255, 50, 50, 0.2)', padding: '5px 10px', borderRadius: '8px', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', animation: 'pulse 2s infinite' }} />
          LIVE AUCTION
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* Main Stage */}
        <div className="glass-panel" style={{ flex: '2 1 400px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(180deg, rgba(255, 0, 128, 0.1) 0%, transparent 100%)', zIndex: 0 }} />
          
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', zIndex: 1, marginBottom: '2rem' }}>Main Stage</h2>
          
          {roomData.activePlayerId ? (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', zIndex: 1, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '200px', height: '280px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={64} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h1 style={{ fontSize: '3rem', lineHeight: '1.1', marginBottom: '1rem' }} className="text-gradient">
                  Player on Block
                </h1>
                
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid #ff0080', marginBottom: '1rem' }}>
                  <p style={{ color: '#ff0080', fontSize: '0.9rem', textTransform: 'uppercase' }}>Current Bid</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Coins size={24} /> {roomData.currentBid || 0}
                  </p>
                  <p style={{ color: 'var(--text-main)', marginTop: '5px' }}>
                    Highest Bidder: <strong style={{ color: 'var(--secondary)' }}>{roomData.highestBidder !== 'None' ? roomData.highestBidder : 'Waiting...'}</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              <h3 style={{ fontSize: '1.5rem', textAlign: 'center' }}>Waiting for action...</h3>
              <p>The host is deciding the next move.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Chat */}
        <div className="glass-panel" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Live Chat</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', marginTop: 'auto', marginBottom: 'auto' }}>No messages yet. Be the first to hype it up!</p>
            ) : null}
            
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === myNickname ? 'flex-end' : 'flex-start' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px', marginLeft: '5px', marginRight: '5px' }}>{msg.sender}</span>
                <div style={{ 
                  background: msg.sender === myNickname ? 'var(--primary)' : 'rgba(0,0,0,0.5)', 
                  color: msg.sender === myNickname ? '#000' : 'var(--text-main)',
                  padding: '8px 12px', 
                  borderRadius: '12px',
                  borderTopRightRadius: msg.sender === myNickname ? '0' : '12px',
                  borderTopLeftRadius: msg.sender === myNickname ? '12px' : '0',
                  maxWidth: '80%',
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="Send a message..." 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              style={{ flex: 1, padding: '10px', fontSize: '0.9rem', marginBottom: 0 }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '10px', backgroundImage: 'linear-gradient(135deg, #ff0080, #ff8c00)' }} disabled={!chatInput.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
