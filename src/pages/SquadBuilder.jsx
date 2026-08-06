import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield, Swords, BrainCircuit, Activity } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const FORMATIONS = {
  '4-3-3': [
    { id: 'gk', label: 'GK', top: '90%', left: '50%' },
    { id: 'lb', label: 'LB', top: '70%', left: '15%' },
    { id: 'cb1', label: 'CB', top: '75%', left: '35%' },
    { id: 'cb2', label: 'CB', top: '75%', left: '65%' },
    { id: 'rb', label: 'RB', top: '70%', left: '85%' },
    { id: 'cm1', label: 'CMF', top: '50%', left: '30%' },
    { id: 'dmf', label: 'DMF', top: '55%', left: '50%' },
    { id: 'cm2', label: 'CMF', top: '50%', left: '70%' },
    { id: 'lwf', label: 'LWF', top: '25%', left: '20%' },
    { id: 'cf', label: 'CF', top: '20%', left: '50%' },
    { id: 'rwf', label: 'RWF', top: '25%', left: '80%' }
  ],
  '4-4-2': [
    { id: 'gk', label: 'GK', top: '90%', left: '50%' },
    { id: 'lb', label: 'LB', top: '75%', left: '15%' },
    { id: 'cb1', label: 'CB', top: '80%', left: '35%' },
    { id: 'cb2', label: 'CB', top: '80%', left: '65%' },
    { id: 'rb', label: 'RB', top: '75%', left: '85%' },
    { id: 'lm', label: 'LMF', top: '50%', left: '20%' },
    { id: 'cm1', label: 'CMF', top: '55%', left: '40%' },
    { id: 'cm2', label: 'CMF', top: '55%', left: '60%' },
    { id: 'rm', label: 'RMF', top: '50%', left: '80%' },
    { id: 'cf1', label: 'CF', top: '25%', left: '35%' },
    { id: 'cf2', label: 'CF', top: '25%', left: '65%' }
  ],
  '3-4-3': [
    { id: 'gk', label: 'GK', top: '90%', left: '50%' },
    { id: 'cb1', label: 'CB', top: '75%', left: '25%' },
    { id: 'cb2', label: 'CB', top: '80%', left: '50%' },
    { id: 'cb3', label: 'CB', top: '75%', left: '75%' },
    { id: 'lm', label: 'LMF', top: '50%', left: '15%' },
    { id: 'cm1', label: 'CMF', top: '55%', left: '35%' },
    { id: 'cm2', label: 'CMF', top: '55%', left: '65%' },
    { id: 'rm', label: 'RMF', top: '50%', left: '85%' },
    { id: 'lwf', label: 'LWF', top: '25%', left: '20%' },
    { id: 'cf', label: 'CF', top: '20%', left: '50%' },
    { id: 'rwf', label: 'RWF', top: '25%', left: '80%' }
  ]
};

export default function SquadBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const myTeamName = localStorage.getItem('pitchbid_team');
  
  const [roster, setRoster] = useState([]);
  const [formation, setFormation] = useState('4-3-3');
  const [pitchData, setPitchData] = useState({}); // { slotId: playerId }
  const [captainId, setCaptainId] = useState(null);
  const [viceCaptainId, setViceCaptainId] = useState(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  
  useEffect(() => {
    if (!roomCode || !myTeamName) {
      navigate('/');
      return;
    }
    
    const fetchRoster = async () => {
      const q = query(collection(db, 'rooms', roomCode, 'players'));
      const snap = await getDocs(q);
      const allPlayers = [];
      snap.forEach(d => allPlayers.push({ id: d.id, ...d.data() }));
      const myPlayers = allPlayers.filter(p => p.status === 'sold' && p.soldTo === myTeamName);
      setRoster(myPlayers);
    };
    fetchRoster();
  }, [roomCode, myTeamName, navigate]);

  const handleSlotClick = (slotId) => {
    if (selectedSlot === slotId) setSelectedSlot(null);
    else setSelectedSlot(slotId);
  };

  const handleAssignPlayer = (playerId) => {
    if (!selectedSlot) return;
    
    // Check if player is already on pitch, remove them from old slot
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

  const toggleRole = (playerId, role, e) => {
    e.stopPropagation();
    if (role === 'C') {
      if (captainId === playerId) setCaptainId(null);
      else { setCaptainId(playerId); if (viceCaptainId === playerId) setViceCaptainId(null); }
    } else {
      if (viceCaptainId === playerId) setViceCaptainId(null);
      else { setViceCaptainId(playerId); if (captainId === playerId) setCaptainId(null); }
    }
  };

  // TACTICAL ENGINE CALCULATION
  const calculateTactics = () => {
    const onPitchIds = Object.values(pitchData);
    const onPitchPlayers = onPitchIds.map(id => roster.find(p => p.id === id)).filter(Boolean);
    
    let attackScore = 50;
    let defenseScore = 50;
    let midfieldScore = 50;
    let report = "Assign 11 players to generate a tactical report.";

    if (onPitchPlayers.length === 11) {
      const cbs = onPitchPlayers.filter(p => p.positions?.includes('CB')).length;
      const attackers = onPitchPlayers.filter(p => p.positions?.some(pos => ['CF', 'LWF', 'RWF', 'SS'].includes(pos))).length;
      const mids = onPitchPlayers.filter(p => p.positions?.some(pos => ['CMF', 'DMF', 'AMF', 'LMF', 'RMF'].includes(pos))).length;

      defenseScore = Math.min(99, 40 + (cbs * 15));
      attackScore = Math.min(99, 40 + (attackers * 12));
      midfieldScore = Math.min(99, 40 + (mids * 10));

      if (cbs < 2) report = "WARNING: Critical defensive vulnerability. You are playing without enough natural Center Backs. Expect to concede goals on the counter.";
      else if (attackers >= 4) report = "AGGRESSIVE: A highly offensive setup. You have heavy firepower upfront. We recommend a high-pressing strategy (Gegenpress) to keep the ball in the final third.";
      else if (mids >= 4 && cbs >= 3) report = "BALANCED/DEFENSIVE: Solid structure. Your midfield density is excellent for possession-based styles like Tiki-Taka or solid defensive counter-attacks.";
      else report = "BALANCED: A structurally sound formation. Ensure your wingers drop back to support the fullbacks defensively.";
    }

    return { attackScore, defenseScore, midfieldScore, report };
  };

  const tactics = calculateTactics();

  return (
    <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{ padding: '1.5rem', background: 'var(--panel-bg)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-outline" onClick={() => navigate(`/auction?room=${roomCode}`)} style={{ padding: '8px 12px', border: 'none' }}>
            <ArrowLeft size={18} /> Back to Auction
          </button>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Franchise Manager: <span style={{ color: 'var(--primary)' }}>{myTeamName}</span></h1>
        </div>
        
        <select 
          value={formation} 
          onChange={(e) => { setFormation(e.target.value); setPitchData({}); }}
          className="premium-input" 
          style={{ width: 'auto', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
        >
          {Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f} Formation</option>)}
        </select>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', flex: 1, overflow: 'hidden' }}>
        
        {/* Pitch Area */}
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111', overflowY: 'auto' }}>
          
          <div style={{ 
            width: '100%', maxWidth: '700px', aspectRatio: '2/3', background: '#1a5c2d', 
            borderRadius: '8px', border: '2px solid rgba(255,255,255,0.5)', position: 'relative',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0.05) 20%)'
          }}>
            {/* Pitch Lines */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.5)', transform: 'translateY(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100px', height: '100px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
            <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: '15%', border: '2px solid rgba(255,255,255,0.5)', borderTop: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: '15%', border: '2px solid rgba(255,255,255,0.5)', borderBottom: 'none' }} />
            
            {/* Players on Pitch */}
            {FORMATIONS[formation].map(slot => {
              const assignedPlayerId = pitchData[slot.id];
              const player = assignedPlayerId ? roster.find(p => p.id === assignedPlayerId) : null;
              const isSelected = selectedSlot === slot.id;

              return (
                <div 
                  key={slot.id} 
                  onClick={() => handleSlotClick(slot.id)}
                  style={{ 
                    position: 'absolute', top: slot.top, left: slot.left, transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 10
                  }}
                >
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: player ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.1)', border: isSelected ? '2px solid var(--primary)' : player ? '2px solid var(--secondary)' : '2px dashed rgba(255,255,255,0.3)',
                    boxShadow: player ? '0 5px 15px rgba(0,0,0,0.5)' : 'none', position: 'relative', transition: 'all 0.2s'
                  }}>
                    {player ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{slot.label}</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{slot.label}</span>
                    )}

                    {player && (
                      <button onClick={(e) => handleRemovePlayer(slot.id, e)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4444', border: 'none', borderRadius: '50%', width: '16px', height: '16px', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    )}
                    
                    {player && captainId === player.id && <div style={{ position: 'absolute', bottom: '-5px', left: '-5px', background: '#ffd700', color: '#000', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px' }}>C</div>}
                    {player && viceCaptainId === player.id && <div style={{ position: 'absolute', bottom: '-5px', left: '-5px', background: 'silver', color: '#000', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px' }}>VC</div>}
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
        </div>

        {/* Right Sidebar: Tactical Engine & Roster */}
        <div style={{ background: 'var(--panel-bg)', borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <BrainCircuit size={16} /> PitchBid Tactical Engine™
            </h3>
            
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

            <div style={{ marginTop: '1rem', padding: '10px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {tactics.report}
            </div>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            {selectedSlot ? (
              <div style={{ background: 'rgba(0,229,255,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', color: 'var(--secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                Select a player below to assign to this position.
              </div>
            ) : (
               <div style={{ padding: '10px', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                Click a position on the pitch to assign players.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roster.map(p => {
                const isOnPitch = Object.values(pitchData).includes(p.id);
                return (
                  <div 
                    key={p.id} 
                    className="list-item" 
                    onClick={() => handleAssignPlayer(p.id)}
                    style={{ 
                      cursor: selectedSlot ? 'pointer' : 'default',
                      opacity: isOnPitch ? 0.4 : 1,
                      borderLeft: `3px solid ${isOnPitch ? 'var(--text-muted)' : 'var(--primary)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.realName}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.positions?.join(', ')}</p>
                      </div>
                      
                      {!isOnPitch && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={(e) => toggleRole(p.id, 'C', e)} style={{ padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px', background: captainId === p.id ? '#ffd700' : 'rgba(255,255,255,0.1)', color: captainId === p.id ? '#000' : '#fff', border: 'none', cursor: 'pointer' }}>C</button>
                          <button onClick={(e) => toggleRole(p.id, 'VC', e)} style={{ padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px', background: viceCaptainId === p.id ? 'silver' : 'rgba(255,255,255,0.1)', color: viceCaptainId === p.id ? '#000' : '#fff', border: 'none', cursor: 'pointer' }}>VC</button>
                        </div>
                      )}
                      {isOnPitch && <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ON PITCH</span>}
                    </div>
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
