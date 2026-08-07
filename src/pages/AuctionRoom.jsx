import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Coins, Clock, AlertTriangle, Users, Shuffle, CheckCircle2, Info, X, Edit2, Save, Pause, Play, Heart, ThumbsDown, ThumbsUp, Flame, List, ShieldCheck } from 'lucide-react';
import { doc, getDoc, getDocs, updateDoc, onSnapshot, collection, query, addDoc, serverTimestamp, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import RostersModal from '../components/RostersModal';
import OnboardingTour from '../components/OnboardingTour';

export default function AuctionRoom() {
  // Touch Handlers for Swipe Navigation
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
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [isRostersOpen, setIsRostersOpen] = useState(false);

  const [mobileTab, setMobileTab] = useState('center'); // 'left', 'center', 'right'

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  
  const [reactions, setReactions] = useState([]);

  // For tracking animations
  const prevBidRef = useRef(0);
  const [pulseBid, setPulseBid] = useState(false);
  const prevActivePlayerRef = useRef(null);
  const [showSoldStamp, setShowSoldStamp] = useState(false);
  const [soldToText, setSoldToText] = useState('');

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
      }
    });

    const q = query(collection(db, 'rooms', roomCode, 'players'));
    const unsubPlayers = onSnapshot(q, (snapshot) => {
      const p = [];
      snapshot.forEach(d => p.push({ id: d.id, ...d.data() }));
      setPlayers(p);
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
      unsubReactions();
    };
  }, [roomCode, myTeamName]);

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

  // Handle active player & animations
  useEffect(() => {
    if (roomData) {
      if (roomData.activePlayerId) {
        const ap = players.find(p => p.id === roomData.activePlayerId);
        if (ap) setActivePlayer(ap);
        setShowSoldStamp(false); // New player on block
      } else {
        // Did we just sell someone?
        if (prevActivePlayerRef.current && roomData.activePlayerId === null && roomData.status === 'live') {
          const justSoldPlayer = players.find(p => p.id === prevActivePlayerRef.current);
          if (justSoldPlayer && justSoldPlayer.status === 'sold') {
             setSoldToText(justSoldPlayer.soldTo);
             setShowSoldStamp(true);
             setTimeout(() => setShowSoldStamp(false), 2000);
          }

          // Auto-Random Next Player after delay
          if (isHost) {
            setTimeout(async () => {
              try {
                const q = query(collection(db, 'rooms', roomCode, 'players'), where('status', '==', 'pending'));
                const snap = await getDocs(q);
                const pending = snap.docs.map(d => ({id: d.id, ...d.data()}));
                if (pending.length > 0) {
                  const rand = pending[Math.floor(Math.random() * pending.length)];
                  await updateDoc(doc(db, 'rooms', roomCode), {
                    activePlayerId: rand.id,
                    currentBid: rand.basePrice || 200,
                    highestBidder: 'None',
                    timeLeft: 13
                  });
                }
              } catch(e) { console.error("Auto next error", e); }
            }, 3000); // 3 seconds delay for sold animation
          }
        }
        setActivePlayer(null);
      }
      prevActivePlayerRef.current = roomData.activePlayerId;

      // Pulse bid animation
      if (roomData.currentBid > prevBidRef.current) {
        setPulseBid(true);
        setTimeout(() => setPulseBid(false), 500);
      }
      prevBidRef.current = roomData.currentBid || 0;
    }
  }, [roomData?.activePlayerId, roomData?.currentBid, roomData?.status, players]);


  // Logic actions
  const handleReadyToggle = async () => {
    if (!roomData) return;
    const me = roomData.owners?.find(o => o.name === myTeamName);
    const newStatus = !me?.isReady;
    
    const updatedOwners = roomData.owners.map(o => {
      if (o.name === myTeamName) return { ...o, isReady: newStatus };
      return o;
    });
    await updateDoc(doc(db, 'rooms', roomCode), { owners: updatedOwners });
  };

  const handleStartAuction = async () => {
    await updateDoc(doc(db, 'rooms', roomCode), { status: 'live' });
  };

  const handleToggleBreak = async () => {
    if (!roomData) return;
    const me = roomData.owners?.find(o => o.name === myTeamName);
    const newBreakStatus = !me?.wantsBreak;
    
    let updatedOwners = roomData.owners.map(o => {
      if (o.name === myTeamName) return { ...o, wantsBreak: newBreakStatus };
      return o;
    });

    const breakCount = updatedOwners.filter(o => o.wantsBreak).length;
    const totalOwners = updatedOwners.length;
    const breakRatio = breakCount / totalOwners;

    const updates = { owners: updatedOwners };
    
    if (breakRatio >= 0.7) {
      // Initiate Break
      updates.status = 'break';
      // Reset everyone's ready status so they have to re-ready after break
      updates.owners = updatedOwners.map(o => ({ ...o, isReady: false, wantsBreak: false }));
    }

    await updateDoc(doc(db, 'rooms', roomCode), updates);
  };

  const handleBid = async (customIncrement = null) => {
    if (!roomData || !activePlayer || roomData.status !== 'live') return;
    
    const mySpent = players
      .filter(p => p.soldTo === myTeamName && p.status === 'sold')
      .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const myRemaining = roomData.budgetPerTeam - mySpent;

    const current = roomData.currentBid || activePlayer.basePrice || 200;
    const dynamicIncrement = Math.max(50, Math.round((roomData.budgetPerTeam * 0.005) / 10) * 10);
    const incrementAmt = customIncrement || dynamicIncrement;
    const newBid = current + incrementAmt;
    
    // Haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
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
        currentBid: p?.basePrice || 200,
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

  const handleSaveTeamName = async () => {
    if (!editNameValue.trim() || editNameValue === myTeamName) {
      setIsEditingName(false);
      return;
    }
    const newName = editNameValue.trim();
    const updatedOwners = roomData.owners.map(o => {
      if (o.name === myTeamName) return { ...o, name: newName };
      return o;
    });
    
    try {
      await updateDoc(doc(db, 'rooms', roomCode), { owners: updatedOwners });
      localStorage.setItem('pitchbid_team', newName);
      window.location.reload(); 
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

  if (!roomData) return <div className="min-h-screen flex-center"><h2 className="text-gradient pulse-gold">Loading Broadcast...</h2></div>;

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const soldPlayers = players.filter(p => p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  const me = roomData.owners?.find(o => o.name === myTeamName);
  const isMyReady = me?.isReady;
  const isMyBreak = me?.wantsBreak;
  const allOwnersReady = roomData.owners?.every(o => o.isReady) && roomData.owners?.length === roomData.numOwners;

  // MODALS
  const renderRoomInfoModal = () => {
    if (!showRoomInfo) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
          <button onClick={() => setShowRoomInfo(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }} className="text-gradient-primary">Control Room</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,212,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Owner Code</p>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--secondary)', margin: 0, letterSpacing: '0.1em' }}>{roomData.ownerCode}</h3>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)', maxHeight: '30vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Owner Slot Passwords</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {roomData.owners?.map((o, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Slot {idx + 1} {o.name ? <strong style={{color: 'var(--text-main)'}}>({o.name})</strong> : '(Empty)'}</span>
                    <strong style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>{o.pass}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(0,255,136,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Player Code</p>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0, letterSpacing: '0.1em' }}>{roomData.playerCode}</h3>
              </div>
              <div style={{ background: 'rgba(255,0,128,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,0,128,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Viewer Code</p>
                <h3 style={{ fontSize: '1.2rem', color: '#ff0080', margin: 0, letterSpacing: '0.1em' }}>{roomData.viewerCode}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
    
    // Ignore swipe if vertical scrolling is dominant
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

  const actionCenter = (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(180deg, rgba(30,30,35,0.8) 0%, rgba(20,20,24,0.9) 100%)', position: 'relative' }}>
      <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 'bold' }}>Current Bid</p>
      
      <h1 className={pulseBid ? 'pulse-gold' : ''} style={{ 
        fontSize: '4rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
        margin: '0.5rem 0', fontWeight: '900', letterSpacing: '-0.02em', transition: 'color 0.2s'
      }}>
        <Coins size={32} /> {roomData?.currentBid || (activePlayer?.basePrice || 0)}
      </h1>
      
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest Bidder</p>
        <strong style={{ color: roomData?.highestBidder !== 'None' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '1.1rem' }}>
          {roomData?.highestBidder || 'None'}
        </strong>
      </div>
      
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
        color: roomData?.timeLeft <= 5 ? '#ff0044' : 'var(--text-main)', 
        fontSize: '2rem', fontWeight: '900', marginBottom: '1.5rem',
        textShadow: roomData?.timeLeft <= 5 ? '0 0 20px rgba(255,0,68,0.5)' : 'none'
      }}>
        <Clock size={28} /> 00:{roomData?.timeLeft < 10 ? `0${roomData?.timeLeft || 0}` : (roomData?.timeLeft || 0)}
      </div>

      {(() => {
        const dynamicIncrement = Math.max(50, Math.round((roomData?.budgetPerTeam * 0.005) / 10) * 10);
        const isWinning = roomData?.highestBidder === myTeamName;
        
        return (
          <button 
            className={isWinning ? "btn-outline" : "btn-primary"} 
            style={{ 
              width: '100%', padding: '1.2rem', fontSize: '1.2rem', 
              transition: 'transform 0.1s, background-color 0.3s',
              opacity: (!activePlayer || roomData?.status !== 'live') ? 0.5 : 1
            }} 
            onClick={() => handleBid(null)} 
            onMouseDown={e => { if (!isWinning && activePlayer) e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            disabled={!activePlayer || roomData?.status !== 'live' || isWinning}
          >
            {isWinning ? "WINNING BID" : `BID +${dynamicIncrement}`}
          </button>
        );
      })()}

      {isHost && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
          <button className="btn-outline" style={{ flex: 1, padding: '12px', borderColor: '#ff0044', color: '#ff0044' }} onClick={handleMarkUnsold} disabled={!activePlayer}>
            <ThumbsDown size={18} /> Pass
          </button>
          <button className="btn-primary" style={{ flex: 2, padding: '12px' }} onClick={handleSellPlayer} disabled={!activePlayer || roomData?.highestBidder === 'None'}>
            <CheckCircle2 size={18} /> SELL
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div 
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {renderRoomInfoModal()}
      
      <OnboardingTour role={isHost ? 'host' : 'owner'} />
      <RostersModal isOpen={isRostersOpen} onClose={() => setIsRostersOpen(false)} roomData={roomData} players={players} />
      
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
            Franchise: <span className="text-gradient-primary" style={{ fontSize: '1.2rem' }}>{myTeamName}</span> {isHost && <span style={{fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(0,255,136,0.2)', color: 'var(--primary)', borderRadius: '4px', marginLeft: '8px'}}>HOST</span>}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          <button 
            className="btn-outline"
            onClick={() => navigate(`/squad-builder?room=${roomCode}`)}
            style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 0, 128, 0.1)', borderColor: '#ff0080', color: '#ff0080' }}
          >
            <ShieldCheck size={14} /> Tactics
          </button>

          <button 
            className="btn-outline"
            onClick={() => setIsRostersOpen(true)}
            style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0, 229, 255, 0.1)', borderColor: 'var(--secondary)', color: 'var(--text-main)' }}
          >
            <List size={14} /> View Squads
          </button>
          
          {roomData.status === 'live' && (
            <button 
              className={`btn-outline ${isMyBreak ? 'danger' : ''}`}
              onClick={handleToggleBreak}
              style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <Pause size={14} /> {isMyBreak ? 'Cancel Break Vote' : 'Vote for Break'}
            </button>
          )}

          {isHost && (
            <button 
              className="btn-outline" 
              onClick={() => setShowRoomInfo(true)}
              style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <Info size={14} /> Codes & Info
            </button>
          )}

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
        
        {/* Left Sidebar: Draft Pool */}
        <div className={`glass-panel mobile-tab-content ${mobileTab === 'left' ? 'active' : ''}`} style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            <Users size={16} /> Draft Pool <span style={{ color: 'var(--text-main)' }}>{pendingPlayers.length}</span>
          </h3>

          {isHost && pendingPlayers.length > 0 && roomData.status === 'live' && (
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginBottom: '1.5rem' }}
              onClick={handleSendRandomToBlock}
            >
              <Shuffle size={16} /> Random Draw
            </button>
          )}

          {isHost && pendingPlayers.length === 0 && unsoldPlayers.length > 0 && !activePlayer && (
            <button 
              className="btn-outline danger" 
              style={{ width: '100%', marginBottom: '1.5rem' }}
              onClick={handleRestartUnsoldLot}
            >
              Restart Unsold Lot
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pendingPlayers.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No players remaining</div> : null}
            {pendingPlayers.map(p => (
              <div key={p.id} className="list-item" style={{ borderLeft: '3px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{p.realName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--secondary)' }}>{p.positions?.join(', ')}</span> • {p.village}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                    ₹{p.basePrice || 200}
                  </span>
                </div>
                {isHost && roomData.status === 'live' && (
                  <button 
                    className="btn-outline" 
                    style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
                    onClick={() => handleSendToBlock(p.id)}
                  >
                    SEND TO BLOCK
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Main Stage / Broadcast View */}
        <div className={`glass-panel mobile-tab-content ${mobileTab === 'center' ? 'active' : ''}`} style={{ position: 'relative', overflowY: 'auto', overflowX: 'hidden', padding: 0 }}>
          
          {/* Subtle Stage Background */}
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
                {roomData.status === 'break' ? 'The auction has been paused. Ready up to resume.' : 'All franchises must mark themselves ready before the broadcast begins.'}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px', marginBottom: '3rem' }}>
                {roomData.owners?.map((o, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(0,0,0,0.4)', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    border: o.name === myTeamName ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)' 
                  }}>
                    <span style={{ fontWeight: '600', fontSize: '1.1rem', color: o.name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {o.name ? o.name : `Empty Slot ${idx + 1}`}
                    </span>
                    {o.isReady ? (
                      <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        <CheckCircle2 size={18} /> Ready
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Waiting</span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                  className={isMyReady ? "btn-outline" : "btn-primary"} 
                  onClick={handleReadyToggle} 
                  style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}
                >
                  {isMyReady ? 'Cancel Ready' : 'I Am Ready'}
                </button>

                {isHost && (
                  <button 
                    className="btn-primary" 
                    style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, #0077ff 100%)', padding: '1rem 2.5rem', fontSize: '1.1rem' }} 
                    disabled={!allOwnersReady} 
                    onClick={handleStartAuction}
                  >
                    <Play size={18} /> Broadcast
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '3rem 2rem', width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>On The Block</h2>
              </div>
              
              {activePlayer ? (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    
                    {/* Player Image / Avatar Graphic */}
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

                    {/* Player Details */}
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
                        
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Profile</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{activePlayer.foot} • {activePlayer.age}y</p>
                        </div>
                        
                        <div style={{ background: 'rgba(0,255,136,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.2)' }}>
                          <p style={{ color: 'var(--primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Base Price</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Coins size={16} color="var(--primary)" /> {activePlayer.basePrice || 200}
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div className="mobile-only" style={{ marginTop: '2rem' }}>
                    {actionCenter}
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

        {/* Right Sidebar: Bidding Panel & Wallets */}
        <div className={`mobile-tab-content ${mobileTab === 'right' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
          
          {/* Action Center - Desktop View */}
          <div className="desktop-only">
            {actionCenter}
          </div>

          {/* Wallets */}
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Franchise Wallets</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomData.owners?.map((owner, index) => {
                const spent = soldPlayers
                  .filter(p => p.soldTo === owner.name)
                  .reduce((sum, p) => sum + (p.soldPrice || 0), 0);
                const remaining = roomData.budgetPerTeam - spent;
                
                return (
                  <div key={index} className="list-item" style={{ borderLeft: owner.name === myTeamName ? '3px solid var(--primary)' : '3px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      
                      {isEditingName && owner.name === myTeamName ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <input 
                            type="text" 
                            className="premium-input" 
                            style={{ padding: '4px 8px', fontSize: '0.9rem', margin: 0, width: '120px', background: 'rgba(0,0,0,0.5)' }}
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTeamName()}
                            autoFocus
                          />
                          <button onClick={handleSaveTeamName} style={{ background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}>
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {owner.name || `Team ${index + 1}`}
                          {owner.name === myTeamName && (
                            <button 
                              onClick={() => { setIsEditingName(true); setEditNameValue(owner.name); }} 
                              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </span>
                      )}

                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <Coins size={14} /> {remaining} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>left</span>
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold' }}>
                PLAYERS SOLD <span>{soldPlayers.length}</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: '#ff0044', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                UNSOLD LOTS <span>{unsoldPlayers.length}</span>
              </p>
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

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button className={mobileTab === 'left' ? 'active' : ''} onClick={() => setMobileTab('left')}>
          <Users size={20} />
          <span>Draft</span>
        </button>
        <button className={mobileTab === 'center' ? 'active' : ''} onClick={() => setMobileTab('center')}>
          <Play size={20} />
          <span>Stage</span>
        </button>
        <button className={mobileTab === 'right' ? 'active' : ''} onClick={() => setMobileTab('right')}>
          <Coins size={20} />
          <span>Bids</span>
        </button>
      </div>
    </div>
  );
}
