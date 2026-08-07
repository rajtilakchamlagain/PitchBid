import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Clock, AlertTriangle, Users, MessageCircle, Send, List, Play, Activity, Target, Shield, LayoutDashboard, MonitorPlay, Sparkles } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import RostersModal from '../components/RostersModal';
import OnboardingTour from '../components/OnboardingTour';

export default function ViewerRoom() {
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const touchStartY = useRef(null);
  const touchEndY = useRef(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reactions, setReactions] = useState([]);
  const [isRostersOpen, setIsRostersOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('center'); 

  // Viewer Modes: 'interstitial', 'live', 'dashboard', 'finale'
  const [viewerMode, setViewerMode] = useState('interstitial'); 

  const viewerName = localStorage.getItem('pitchbid_viewer') || 'Anonymous Fan';

  const prevBidRef = useRef(0);
  const [pulseBid, setPulseBid] = useState(false);
  const prevActivePlayerRef = useRef(null);
  const [showSoldStamp, setShowSoldStamp] = useState(false);
  const [showUnsoldStamp, setShowUnsoldStamp] = useState(false);
  const [soldToText, setSoldToText] = useState('');
  const [hasFinishedTriggered, setHasFinishedTriggered] = useState(false);

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

    const reactQ = query(collection(db, 'rooms', roomCode, 'reactions'), orderBy('createdAt', 'desc'), limit(1));
    let initialLoad = true;
    const unsubReactions = onSnapshot(reactQ, (snap) => {
      if (initialLoad) { initialLoad = false; return; }
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const r = change.doc.data();
          const newReaction = { id: change.doc.id, emoji: r.emoji, x: Math.random() * 80 + 10 };
          setReactions(prev => [...prev, newReaction]);
          setTimeout(() => setReactions(prev => prev.filter(x => x.id !== newReaction.id)), 2000);
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

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');
  const soldPlayers = players.filter(p => p.status === 'sold');

  // Check Auction Finished Status
  const isAuctionFinished = roomData && pendingPlayers.length === 0 && unsoldPlayers.length === 0 && !roomData.activePlayerId && players.length > 0;

  useEffect(() => {
    if (isAuctionFinished && !hasFinishedTriggered) {
      setViewerMode('finale');
      setHasFinishedTriggered(true);
    }
  }, [isAuctionFinished, hasFinishedTriggered]);

  useEffect(() => {
    if (roomData) {
      if (roomData.activePlayerId) {
        const ap = players.find(p => p.id === roomData.activePlayerId);
        if (ap) setActivePlayer(ap);
        setShowSoldStamp(false);
        setShowUnsoldStamp(false);
      } else {
        if (prevActivePlayerRef.current && roomData.activePlayerId === null) {
          const justFinishedPlayer = players.find(p => p.id === prevActivePlayerRef.current);
          if (justFinishedPlayer) {
            if (justFinishedPlayer.status === 'sold') {
              setSoldToText(justFinishedPlayer.soldTo);
              setShowSoldStamp(true);
              setTimeout(() => setShowSoldStamp(false), 2000);
            } else if (justFinishedPlayer.status === 'unsold') {
              setShowUnsoldStamp(true);
              setTimeout(() => setShowUnsoldStamp(false), 2000);
            }
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
    } catch (err) {}
  };

  const sendReaction = async (emoji) => {
    await addDoc(collection(db, 'rooms', roomCode, 'reactions'), {
      emoji,
      createdAt: serverTimestamp()
    });
  };

  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchEndY.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };
  const onTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };
  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distanceX = touchStartRef.current - touchEndRef.current;
    const distanceY = touchStartY.current - touchEndY.current;
    if (Math.abs(distanceY) > Math.abs(distanceX)) return;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    if (isLeftSwipe) {
      if (mobileTab === 'left') setMobileTab('center');
      else if (mobileTab === 'center') setMobileTab('right');
    } else if (isRightSwipe) {
      if (mobileTab === 'right') setMobileTab('center');
      else if (mobileTab === 'center') setMobileTab('left');
    }
  };

  if (!roomData) return <div className="min-h-screen flex-center"><h2 className="text-gradient pulse-gold">Tuning into Broadcast...</h2></div>;

  // Render Interstitial
  if (viewerMode === 'interstitial') {
    return (
      <div className="min-h-screen flex-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,0,128,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        
        <div className="glass-panel animate-fade-in" style={{ padding: '3rem', width: '90%', maxWidth: '600px', textAlign: 'center', zIndex: 10 }}>
          <h1 className="text-gradient-primary" style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: '900', letterSpacing: '-1px' }}>PITCHBID</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '3rem' }}>Select your broadcast experience.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <button 
              onClick={() => setViewerMode('live')}
              disabled={isAuctionFinished}
              style={{
                padding: '2rem', borderRadius: '16px', border: '1px solid rgba(0,212,255,0.3)',
                background: isAuctionFinished ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(0,102,255,0.1) 100%)',
                cursor: isAuctionFinished ? 'not-allowed' : 'pointer',
                opacity: isAuctionFinished ? 0.5 : 1, transition: 'all 0.3s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
              }}
              className={isAuctionFinished ? '' : 'hover-scale'}
            >
              <MonitorPlay size={48} color={isAuctionFinished ? '#666' : '#00d4ff'} />
              <div>
                <h3 style={{ fontSize: '1.5rem', color: isAuctionFinished ? '#666' : '#fff', margin: '0 0 5px 0' }}>Watch Live Auction</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{isAuctionFinished ? 'Auction has concluded.' : 'Join the real-time bidding war.'}</p>
              </div>
            </button>

            <button 
              onClick={() => setViewerMode('dashboard')}
              style={{
                padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,215,0,0.3)',
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,100,0,0.1) 100%)',
                cursor: 'pointer', transition: 'all 0.3s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
              }}
              className="hover-scale pulse-gold-border"
            >
              <LayoutDashboard size={48} color="#ffd700" />
              <div>
                <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: '0 0 5px 0' }}>Premium Dashboard</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Analyze squads, budgets, and post-auction tactics.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Finale
  if (viewerMode === 'finale') {
    return (
      <div className="min-h-screen flex-center" style={{ background: '#000', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 80%)', animation: 'pulse 2s infinite' }} />
        
        <div className="animate-fade-in" style={{ zIndex: 10, textAlign: 'center' }}>
          <Sparkles size={80} color="#ffd700" style={{ margin: '0 auto 2rem auto', animation: 'spin 10s linear infinite' }} />
          <h1 style={{ fontSize: '4rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: '4px', margin: 0, textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>Auction Concluded</h1>
          <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '3rem' }}>All players have been drafted.</p>
          
          <button 
            onClick={() => setViewerMode('dashboard')}
            className="btn-primary pulse-gold" 
            style={{ padding: '1.5rem 3rem', fontSize: '1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '1rem', margin: '0 auto' }}
          >
            <LayoutDashboard size={24} /> View Final Squads & Tactics
          </button>
        </div>
      </div>
    );
  }

  // Render Dashboard
  if (viewerMode === 'dashboard') {
    const teams = roomData.owners?.filter(o => o.name) || [];
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', padding: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button className="btn-outline" onClick={() => setViewerMode('interstitial')} style={{ border: 'none' }}>
            <ArrowLeft size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Back
          </button>
          <h1 className="text-gradient-primary" style={{ fontSize: '2rem', margin: 0, letterSpacing: '2px' }}>Trillion Dollar Dashboard</h1>
          <div style={{ width: '100px' }} /> {/* Spacer */}
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          {teams.map((team, idx) => {
            const teamPlayers = soldPlayers.filter(p => p.soldTo === team.name);
            const spent = teamPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
            const remaining = roomData.budgetPerTeam - spent;
            return (
              <div key={idx} className="glass-panel hover-scale" style={{ padding: '1.5rem', border: '1px solid rgba(255,215,0,0.1)' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{team.name}</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Squad Size</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{teamPlayers.length}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining Budget</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00ff88', display: 'flex', alignItems: 'center', gap: '4px' }}><Coins size={14}/> {remaining}</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                  {teamPlayers.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No players bought yet.</p>
                  ) : (
                    teamPlayers.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>{p.realName}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>({p.game === 'football' ? p.positions?.[0] : (p.game === 'cricket' ? p.cricketRole : p.positions?.[0])})</span>
                        </div>
                        <strong style={{ color: '#ffd700' }}>{p.soldPrice}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- LIVE AUCTION MODE ---
  return (
    <div 
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      
      <OnboardingTour role="viewer" />
      <RostersModal isOpen={isRostersOpen} onClose={() => setIsRostersOpen(false)} roomData={roomData} players={players} />

      {reactions.map(r => (
        <div key={r.id} className="float-emoji" style={{ left: `${r.x}%` }}>{r.emoji}</div>
      ))}

      {showSoldStamp && (
        <div className="stamp-sold">
          SOLD TO<br/>
          <span style={{ fontSize: '2rem', color: '#fff', textShadow: 'none' }}>{soldToText}</span>
        </div>
      )}

      {showUnsoldStamp && (
        <div className="stamp-unsold">
          UNSOLD
        </div>
      )}
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0, padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button className="btn-outline" style={{ padding: '8px 16px', border: 'none', background: 'rgba(255,255,255,0.05)' }} onClick={() => setViewerMode('interstitial')}>
            <ArrowLeft size={16} /> Exit
          </button>
          
          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
            Viewing as: <span className="text-gradient-primary" style={{ fontSize: '1.2rem' }}>{viewerName}</span>
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn-outline"
            onClick={() => setViewerMode('dashboard')}
            style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 215, 0, 0.1)', borderColor: '#ffd700', color: '#ffd700' }}
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>

          <button 
            className="btn-outline"
            onClick={() => setIsRostersOpen(true)}
            style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0, 229, 255, 0.1)', borderColor: 'var(--secondary)', color: 'var(--text-main)' }}
          >
            <List size={14} /> Squads
          </button>

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

      <div className="dashboard-grid">
        
        <div className={`glass-panel mobile-tab-content ${mobileTab === 'left' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              <MessageCircle size={16} /> Live Chat
            </h3>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
            {chatMessages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: 'auto', marginBottom: 'auto' }}>Be the first to chat!</p>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === viewerName ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', marginRight: '4px' }}>{msg.sender}</span>
                  <div style={{ 
                    background: msg.sender === viewerName ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)', 
                    padding: '10px 14px', borderRadius: '12px', border: `1px solid ${msg.sender === viewerName ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    maxWidth: '85%', wordBreak: 'break-word', fontSize: '0.95rem'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)' }}>
            <input 
              type="text" 
              placeholder="Join the conversation..." 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              className="premium-input"
              style={{ flex: 1, borderRadius: '20px', padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button type="submit" className="btn-primary" style={{ width: '45px', height: '45px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={!newMessage.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>

        <div className={`glass-panel mobile-tab-content ${mobileTab === 'center' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', zIndex: 10, display: 'flex', justifyContent: 'center', gap: '2rem', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest Bidder</p>
              <div style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px rgba(0, 255, 136, 0.5)' }}>
                {roomData.highestBidder}
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--glass-border)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Bid</p>
              <div className={`text-gradient-primary ${pulseBid ? 'pulse-gold' : ''}`} style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Coins size={16} /> {roomData.currentBid || 0}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem 2rem 2rem', position: 'relative' }}>
            {activePlayer ? (
              <div className="player-card animate-fade-in" style={{ width: '100%', maxWidth: '350px' }}>
                
                {activePlayer.photoURL ? (
                  <div style={{ width: '100%', height: '200px', background: `url(${activePlayer.photoURL}) center/cover`, borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                ) : (
                  <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)', height: '120px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 style={{ fontSize: '3rem', margin: 0, opacity: 0.5, letterSpacing: '4px' }}>{activePlayer.realName.substring(0,2).toUpperCase()}</h2>
                  </div>
                )}
                
                <h2 style={{ fontSize: '2rem', marginBottom: '5px', textAlign: 'center' }}>{activePlayer.realName}</h2>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '1.5rem', letterSpacing: '2px' }}>{activePlayer.nickName ? `"${activePlayer.nickName}"` : 'PLAYER'}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {activePlayer.game === 'cricket' ? (
                    <>
                      <div className="stat-box">
                        <span className="stat-label">Role</span>
                        <span className="stat-value text-gradient-primary">{activePlayer.cricketRole}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Batting</span>
                        <span className="stat-value">{activePlayer.battingStyle}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Bowling</span>
                        <span className="stat-value">{activePlayer.bowlingStyle}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stat-box">
                        <span className="stat-label">Position</span>
                        <span className="stat-value text-gradient-primary">{activePlayer.positions?.[0] || 'N/A'}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">{activePlayer.game === 'volleyball' ? 'Hand' : 'Foot'}</span>
                        <span className="stat-value">{activePlayer.foot}</span>
                      </div>
                    </>
                  )}
                  <div className="stat-box">
                    <span className="stat-label">Age</span>
                    <span className="stat-value">{activePlayer.age}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Base Price</span>
                    <span className="stat-value" style={{ color: '#ffd700' }}>{activePlayer.basePrice || 200}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.5 }}>
                <Clock size={48} style={{ margin: '0 auto', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'normal' }}>Waiting for Next Player...</h3>
              </div>
            )}
          </div>
        </div>

        <div className={`glass-panel mobile-tab-content ${mobileTab === 'right' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              <Play size={16} /> Fan Zone
            </h3>
          </div>
          
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Reactions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {['🔥','👏','🤯','😍','🐐','💔'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="btn-outline hover-scale"
                    style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', flex: '1 1 calc(33% - 10px)' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Auction Status</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Pending Players</span>
                <strong style={{ color: 'var(--primary)' }}>{pendingPlayers.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Sold Players</span>
                <strong style={{ color: 'var(--secondary)' }}>{soldPlayers.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Unsold Players</span>
                <strong style={{ color: '#ff4444' }}>{unsoldPlayers.length}</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Mobile Swipe Indicators */}
      <div className="mobile-swipe-indicators">
        <div className={`indicator ${mobileTab === 'left' ? 'active' : ''}`} />
        <div className={`indicator ${mobileTab === 'center' ? 'active' : ''}`} />
        <div className={`indicator ${mobileTab === 'right' ? 'active' : ''}`} />
      </div>
    </div>
  );
}
