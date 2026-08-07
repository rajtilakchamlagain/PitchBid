import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Activity, Edit3, Save, CheckCircle2 } from 'lucide-react';
import { doc, collection, query, getDocs, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const FORMATIONS = {
  football: {
    '4-3-3': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lb', label: 'LB', top: 70, left: 15 },
      { id: 'cb1', label: 'CB', top: 75, left: 35 },
      { id: 'cb2', label: 'CB', top: 75, left: 65 },
      { id: 'rb', label: 'RB', top: 70, left: 85 },
      { id: 'cm1', label: 'CMF', top: 50, left: 30 },
      { id: 'dmf', label: 'DMF', top: 55, left: 50 },
      { id: 'cm2', label: 'CMF', top: 50, left: 70 },
      { id: 'lwf', label: 'LWF', top: 25, left: 20 },
      { id: 'cf', label: 'CF', top: 20, left: 50 },
      { id: 'rwf', label: 'RWF', top: 25, left: 80 }
    ],
    '4-4-2': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lb', label: 'LB', top: 75, left: 15 },
      { id: 'cb1', label: 'CB', top: 80, left: 35 },
      { id: 'cb2', label: 'CB', top: 80, left: 65 },
      { id: 'rb', label: 'RB', top: 75, left: 85 },
      { id: 'lm', label: 'LMF', top: 50, left: 20 },
      { id: 'cm1', label: 'CMF', top: 55, left: 40 },
      { id: 'cm2', label: 'CMF', top: 55, left: 60 },
      { id: 'rm', label: 'RMF', top: 50, left: 80 },
      { id: 'cf1', label: 'CF', top: 25, left: 35 },
      { id: 'cf2', label: 'CF', top: 25, left: 65 }
    ],
    '4-2-3-1': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lb', label: 'LB', top: 75, left: 15 },
      { id: 'cb1', label: 'CB', top: 80, left: 35 },
      { id: 'cb2', label: 'CB', top: 80, left: 65 },
      { id: 'rb', label: 'RB', top: 75, left: 85 },
      { id: 'dm1', label: 'DMF', top: 60, left: 35 },
      { id: 'dm2', label: 'DMF', top: 60, left: 65 },
      { id: 'lm', label: 'LMF', top: 40, left: 20 },
      { id: 'am', label: 'AMF', top: 35, left: 50 },
      { id: 'rm', label: 'RMF', top: 40, left: 80 },
      { id: 'cf', label: 'CF', top: 15, left: 50 }
    ],
    '3-5-2': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'cb1', label: 'CB', top: 75, left: 30 },
      { id: 'cb2', label: 'CB', top: 80, left: 50 },
      { id: 'cb3', label: 'CB', top: 75, left: 70 },
      { id: 'lwb', label: 'LWB', top: 55, left: 15 },
      { id: 'cm1', label: 'CMF', top: 50, left: 35 },
      { id: 'dm', label: 'DMF', top: 60, left: 50 },
      { id: 'cm2', label: 'CMF', top: 50, left: 65 },
      { id: 'rwb', label: 'RWB', top: 55, left: 85 },
      { id: 'cf1', label: 'CF', top: 25, left: 35 },
      { id: 'cf2', label: 'CF', top: 25, left: 65 }
    ],
    '4-1-4-1': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lb', label: 'LB', top: 75, left: 15 },
      { id: 'cb1', label: 'CB', top: 80, left: 35 },
      { id: 'cb2', label: 'CB', top: 80, left: 65 },
      { id: 'rb', label: 'RB', top: 75, left: 85 },
      { id: 'dm', label: 'DMF', top: 60, left: 50 },
      { id: 'lm', label: 'LMF', top: 40, left: 20 },
      { id: 'cm1', label: 'CMF', top: 45, left: 35 },
      { id: 'cm2', label: 'CMF', top: 45, left: 65 },
      { id: 'rm', label: 'RMF', top: 40, left: 80 },
      { id: 'cf', label: 'CF', top: 15, left: 50 }
    ],
    '3-4-3': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'cb1', label: 'CB', top: 75, left: 25 },
      { id: 'cb2', label: 'CB', top: 80, left: 50 },
      { id: 'cb3', label: 'CB', top: 75, left: 75 },
      { id: 'lm', label: 'LMF', top: 50, left: 15 },
      { id: 'cm1', label: 'CMF', top: 55, left: 35 },
      { id: 'cm2', label: 'CMF', top: 55, left: 65 },
      { id: 'rm', label: 'RMF', top: 50, left: 85 },
      { id: 'lwf', label: 'LWF', top: 25, left: 20 },
      { id: 'cf', label: 'CF', top: 20, left: 50 },
      { id: 'rwf', label: 'RWF', top: 25, left: 80 }
    ],
    '5-3-2': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lwb', label: 'LWB', top: 70, left: 10 },
      { id: 'cb1', label: 'CB', top: 75, left: 30 },
      { id: 'cb2', label: 'CB', top: 80, left: 50 },
      { id: 'cb3', label: 'CB', top: 75, left: 70 },
      { id: 'rwb', label: 'RWB', top: 70, left: 90 },
      { id: 'cm1', label: 'CMF', top: 50, left: 30 },
      { id: 'cm2', label: 'CMF', top: 55, left: 50 },
      { id: 'cm3', label: 'CMF', top: 50, left: 70 },
      { id: 'cf1', label: 'CF', top: 25, left: 35 },
      { id: 'cf2', label: 'CF', top: 25, left: 65 }
    ],
    '4-2-4': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lb', label: 'LB', top: 75, left: 15 },
      { id: 'cb1', label: 'CB', top: 80, left: 35 },
      { id: 'cb2', label: 'CB', top: 80, left: 65 },
      { id: 'rb', label: 'RB', top: 75, left: 85 },
      { id: 'cm1', label: 'CMF', top: 50, left: 35 },
      { id: 'cm2', label: 'CMF', top: 50, left: 65 },
      { id: 'lwf', label: 'LWF', top: 25, left: 15 },
      { id: 'cf1', label: 'CF', top: 20, left: 35 },
      { id: 'cf2', label: 'CF', top: 20, left: 65 },
      { id: 'rwf', label: 'RWF', top: 25, left: 85 }
    ],
    '4-3-1-2': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'lb', label: 'LB', top: 75, left: 15 },
      { id: 'cb1', label: 'CB', top: 80, left: 35 },
      { id: 'cb2', label: 'CB', top: 80, left: 65 },
      { id: 'rb', label: 'RB', top: 75, left: 85 },
      { id: 'cm1', label: 'CMF', top: 55, left: 30 },
      { id: 'dm', label: 'DMF', top: 60, left: 50 },
      { id: 'cm2', label: 'CMF', top: 55, left: 70 },
      { id: 'am', label: 'AMF', top: 40, left: 50 },
      { id: 'cf1', label: 'CF', top: 20, left: 35 },
      { id: 'cf2', label: 'CF', top: 20, left: 65 }
    ],
    '3-4-2-1': [
      { id: 'gk', label: 'GK', top: 90, left: 50 },
      { id: 'cb1', label: 'CB', top: 75, left: 25 },
      { id: 'cb2', label: 'CB', top: 80, left: 50 },
      { id: 'cb3', label: 'CB', top: 75, left: 75 },
      { id: 'lm', label: 'LMF', top: 50, left: 15 },
      { id: 'cm1', label: 'CMF', top: 55, left: 35 },
      { id: 'cm2', label: 'CMF', top: 55, left: 65 },
      { id: 'rm', label: 'RMF', top: 50, left: 85 },
      { id: 'am1', label: 'AMF', top: 35, left: 30 },
      { id: 'am2', label: 'AMF', top: 35, left: 70 },
      { id: 'cf', label: 'CF', top: 15, left: 50 }
    ]
  },
  cricket: {
    'T20 Standard': [
      { id: 'bat1', label: 'Batsman 1', top: 50, left: 45 },
      { id: 'bat2', label: 'Batsman 2', top: 50, left: 55 },
      { id: 'wk', label: 'Wicketkeeper', top: 80, left: 50 },
      { id: 'bowl', label: 'Bowler', top: 20, left: 50 },
      { id: 'slip', label: 'Slip', top: 75, left: 40 },
      { id: 'point', label: 'Point', top: 50, left: 20 },
      { id: 'cover', label: 'Cover', top: 35, left: 25 },
      { id: 'midon', label: 'Mid-on', top: 25, left: 65 },
      { id: 'midoff', label: 'Mid-off', top: 25, left: 35 },
      { id: 'square', label: 'Square Leg', top: 50, left: 80 },
      { id: 'third', label: 'Third Man', top: 85, left: 25 }
    ]
  },
  volleyball: {
    'Standard 6': [
      { id: 'p1', label: 'Pos 1', top: 80, left: 80 },
      { id: 'p2', label: 'Pos 2', top: 30, left: 80 },
      { id: 'p3', label: 'Pos 3', top: 30, left: 50 },
      { id: 'p4', label: 'Pos 4', top: 30, left: 20 },
      { id: 'p5', label: 'Pos 5', top: 80, left: 20 },
      { id: 'p6', label: 'Pos 6', top: 80, left: 50 }
    ]
  }
};

export default function SquadBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const myTeamName = localStorage.getItem('pitchbid_team');
  
  const [roster, setRoster] = useState([]);
  const [gameType, setGameType] = useState('football');
  
  const [formation, setFormation] = useState('4-3-3');
  const [pitchData, setPitchData] = useState({}); // { slotId: playerId }
  const [captainId, setCaptainId] = useState(null);
  const [viceCaptainId, setViceCaptainId] = useState(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  // Custom positions overrides { slotId: { top, left } }
  const [customPositions, setCustomPositions] = useState({});
  const pitchRef = useRef(null);

  useEffect(() => {
    if (!roomCode || !myTeamName) {
      navigate('/');
      return;
    }
    
    const fetchRoster = async () => {
      const q = query(collection(db, 'rooms', roomCode, 'players'));
      const snap = await getDocs(q);
      const allPlayers = [];
      let detectedGame = 'football';
      snap.forEach(d => {
        const p = { id: d.id, ...d.data() };
        allPlayers.push(p);
        if (p.game) detectedGame = p.game;
      });
      const myPlayers = allPlayers.filter(p => p.status === 'sold' && p.soldTo === myTeamName);
      setRoster(myPlayers);
      setGameType(detectedGame);
      
      try {
        const tacticsDoc = await getDoc(doc(db, 'rooms', roomCode, 'tactics', myTeamName));
        if (tacticsDoc.exists()) {
          const data = tacticsDoc.data();
          setFormation(data.formation || '4-2-3-1');
          setPitchData(data.pitchData || {});
          setCustomPositions(data.customPositions || {});
          setIsCustomMode(data.isCustomMode || false);
        } else {
          if (detectedGame === 'cricket') setFormation('T20 Standard');
          else if (detectedGame === 'volleyball') setFormation('Standard 6');
          else setFormation('4-2-3-1');
        }
      } catch (err) {
        console.error("Error loading tactics", err);
        if (detectedGame === 'cricket') setFormation('T20 Standard');
        else if (detectedGame === 'volleyball') setFormation('Standard 6');
        else setFormation('4-2-3-1');
      }
    };
    fetchRoster();
  }, [roomCode, myTeamName, navigate]);

  const handleSlotClick = (slotId) => {
    if (isCustomMode) return; // Disables normal selection in custom mode
    if (selectedSlot === slotId) setSelectedSlot(null);
    else setSelectedSlot(slotId);
  };

  const handleAssignPlayer = (playerId) => {
    if (!selectedSlot) return;
    const newPitch = { ...pitchData };
    Object.keys(newPitch).forEach(k => {
      if (newPitch[k] === playerId) delete newPitch[k];
    });
    newPitch[selectedSlot] = playerId;
    setPitchData(newPitch);
    setSelectedSlot(null);
  };

  const handleRemovePlayer = (slotId, e) => {
    e.stopPropagation();
    const newPitch = { ...pitchData };
    delete newPitch[slotId];
    setPitchData(newPitch);
  };

  // Drag and drop mechanics for Custom Mode
  const handleDragStart = (e, slotId) => {
    if (!isCustomMode) return;
    e.dataTransfer.setData('text/plain', slotId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    if (!isCustomMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    if (!isCustomMode) return;
    e.preventDefault();
    const slotId = e.dataTransfer.getData('text/plain');
    if (!slotId || !pitchRef.current) return;
    
    const rect = pitchRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const leftPercent = (x / rect.width) * 100;
    const topPercent = (y / rect.height) * 100;

    setCustomPositions(prev => ({
      ...prev,
      [slotId]: { left: Math.max(5, Math.min(95, leftPercent)), top: Math.max(5, Math.min(95, topPercent)) }
    }));
  };

  // TACTICAL ENGINE CALCULATION
  const calculateTactics = () => {
    const onPitchIds = Object.values(pitchData);
    const onPitchPlayers = onPitchIds.map(id => roster.find(p => p.id === id)).filter(Boolean);
    
    let attackScore = 50;
    let defenseScore = 50;
    let midfieldScore = 50;
    let report = "Assign players to generate a tactical report.";

    if (gameType === 'football' && onPitchPlayers.length === 11) {
      const cbs = onPitchPlayers.filter(p => p.positions?.includes('CB')).length;
      const attackers = onPitchPlayers.filter(p => p.positions?.some(pos => ['CF', 'LWF', 'RWF', 'SS'].includes(pos))).length;
      const mids = onPitchPlayers.filter(p => p.positions?.some(pos => ['CMF', 'DMF', 'AMF', 'LMF', 'RMF'].includes(pos))).length;

      defenseScore = Math.min(99, 40 + (cbs * 15));
      attackScore = Math.min(99, 40 + (attackers * 12));
      midfieldScore = Math.min(99, 40 + (mids * 10));

      if (cbs < 2) report = "WARNING: Critical defensive vulnerability. You are playing without enough natural Center Backs.";
      else if (attackers >= 4) report = "AGGRESSIVE: A highly offensive setup. You have heavy firepower upfront.";
      else if (mids >= 4 && cbs >= 3) report = "BALANCED/DEFENSIVE: Solid structure. Good for possession.";
      else report = "BALANCED: A structurally sound formation.";
    } else if (gameType === 'cricket' && onPitchPlayers.length === 11) {
      report = "Cricket squad is fully fielded. Ready for the match.";
    } else if (gameType === 'volleyball' && onPitchPlayers.length === 6) {
      report = "Volleyball starting 6 are ready on the court.";
    }

    return { attackScore, defenseScore, midfieldScore, report };
  };


  const [isSaving, setIsSaving] = useState(false);
  const handleSaveTactics = async () => {
    if (!roomCode || !myTeamName) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'rooms', roomCode, 'tactics', myTeamName), {
        formation,
        pitchData,
        customPositions,
        isCustomMode,
        updatedAt: serverTimestamp()
      });
      // Optionally show a toast here, for now changing button text is enough
      setTimeout(() => setIsSaving(false), 1000);
    } catch (err) {
      console.error("Failed to save tactics", err);
      setIsSaving(false);
    }
  };

  const tactics = calculateTactics();
  const currentSlots = FORMATIONS[gameType]?.[formation] || [];

  return (
    <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <header style={{ padding: '1.5rem', background: 'var(--panel-bg)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-outline" onClick={() => navigate(`/auction?room=${roomCode}`)} style={{ padding: '8px 12px', border: 'none' }}>
            <ArrowLeft size={18} /> Back to Auction
          </button>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Manager: <span style={{ color: 'var(--primary)' }}>{myTeamName}</span></h1>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className={isCustomMode ? "btn-primary" : "btn-outline"}
            onClick={() => setIsCustomMode(!isCustomMode)}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 16px' }}
          >
            <Edit3 size={16} /> Custom Layout
          </button>
          <button className="btn-primary" onClick={handleSaveTactics} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 16px', background: isSaving ? 'var(--success)' : 'var(--primary)' }}>{isSaving ? <CheckCircle2 size={16} /> : <Save size={16} />} {isSaving ? 'Saved!' : 'Save Tactics'}</button><select 
            value={formation} 
            onChange={(e) => { setFormation(e.target.value); setCustomPositions({}); }}
            className="premium-input" 
            style={{ width: 'auto', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
          >
            {Object.keys(FORMATIONS[gameType] || {}).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', flex: 1, overflow: 'hidden' }}>
        
        {/* Pitch Area */}
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111', overflowY: 'auto' }}>
          
          <div 
            ref={pitchRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ 
              width: '100%', maxWidth: gameType === 'cricket' ? '800px' : '700px', 
              aspectRatio: gameType === 'cricket' ? '1/1' : '2/3', 
              background: gameType === 'football' ? '#1a5c2d' : gameType === 'volleyball' ? '#e59049' : '#578a3d', 
              borderRadius: gameType === 'cricket' ? '50%' : '8px', 
              border: '2px solid rgba(255,255,255,0.5)', position: 'relative',
              backgroundImage: gameType === 'football' ? 'repeating-linear-gradient(0deg, transparent, transparent 10%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0.05) 20%)' : 'none'
            }}
          >
            {gameType === 'football' && (
              <>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.5)', transform: 'translateY(-50%)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100px', height: '100px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
                <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: '15%', border: '2px solid rgba(255,255,255,0.5)', borderTop: 'none' }} />
                <div style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: '15%', border: '2px solid rgba(255,255,255,0.5)', borderBottom: 'none' }} />
              </>
            )}

            {gameType === 'cricket' && (
              <div style={{ position: 'absolute', top: '40%', left: '45%', width: '10%', height: '20%', background: '#d4c092', borderRadius: '4px' }} />
            )}

            {gameType === 'volleyball' && (
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', background: '#fff', transform: 'translateY(-50%)', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
            )}
            
            {/* Players on Pitch */}
            {currentSlots.map(slot => {
              const assignedPlayerId = pitchData[slot.id];
              const player = assignedPlayerId ? roster.find(p => p.id === assignedPlayerId) : null;
              const isSelected = selectedSlot === slot.id && !isCustomMode;
              
              const topPos = customPositions[slot.id]?.top ?? slot.top;
              const leftPos = customPositions[slot.id]?.left ?? slot.left;

              return (
                <div 
                  key={slot.id} 
                  onClick={() => handleSlotClick(slot.id)}
                  draggable={isCustomMode}
                  onDragStart={(e) => handleDragStart(e, slot.id)}
                  style={{ 
                    position: 'absolute', top: `${topPos}%`, left: `${leftPos}%`, transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                    cursor: isCustomMode ? 'grab' : 'pointer', zIndex: 10,
                    transition: isCustomMode ? 'none' : 'all 0.3s ease'
                  }}
                >
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: player ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.1)', 
                    border: isSelected ? '2px solid var(--primary)' : player ? '2px solid var(--secondary)' : '2px dashed rgba(255,255,255,0.3)',
                    boxShadow: player ? '0 5px 15px rgba(0,0,0,0.5)' : 'none', position: 'relative'
                  }}>
                    {player ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{slot.label}</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{slot.label}</span>
                    )}

                    {!isCustomMode && player && (
                      <button onClick={(e) => handleRemovePlayer(slot.id, e)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4444', border: 'none', borderRadius: '50%', width: '16px', height: '16px', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    )}
                  </div>
                  
                  {player && (
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {player.nickName || player.realName.split(' ')[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {isCustomMode && <p style={{ position: 'absolute', bottom: '20px', left: '20px', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', zIndex: 100 }}>Drag any slot to reposition it.</p>}
        </div>

        {/* Right Sidebar: Tactical Engine & Roster */}
        <div style={{ background: 'var(--panel-bg)', borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <BrainCircuit size={16} /> PitchBid Tactical Engine™
            </h3>
            
            {gameType === 'football' && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ATTACK</p>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff4444' }}>{tactics.attackScore}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MIDFIELD</p>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{tactics.midfieldScore}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DEFENSE</p>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{tactics.defenseScore}</div>
                </div>
              </div>
            )}
            
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              {tactics.report}
            </p>
          </div>

          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }} className="custom-scrollbar">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              {selectedSlot && !isCustomMode ? <span style={{ color: 'var(--secondary)' }}>Select Player for Slot</span> : "Your Roster"}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roster.map(p => {
                const isOnPitch = Object.values(pitchData).includes(p.id);
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      if (!isOnPitch && selectedSlot && !isCustomMode) handleAssignPlayer(p.id);
                    }}
                    style={{ 
                      padding: '12px', background: isOnPitch ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px', border: `1px solid ${isOnPitch ? 'var(--glass-border)' : 'rgba(255,255,255,0.1)'}`,
                      cursor: (selectedSlot && !isOnPitch && !isCustomMode) ? 'pointer' : 'default',
                      opacity: isOnPitch ? 0.5 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                    className={(selectedSlot && !isOnPitch && !isCustomMode) ? "hover-scale" : ""}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{p.realName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {gameType === 'football' ? p.positions?.join(', ') : gameType === 'cricket' ? p.cricketRole : p.positions?.join(', ')}
                      </div>
                    </div>
                    {isOnPitch && <CheckCircle2 size={16} color="var(--primary)" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


