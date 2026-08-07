const fs = require('fs');
const content = `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, UserPlus, Trophy, MapPin, Upload } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

const POSITIONS = {
  football: [
    { id: 'CF', label: 'CF - Center Forward' },
    { id: 'SS', label: 'SS - Second Striker' },
    { id: 'LWF', label: 'LWF - Left Wing Forward' },
    { id: 'RWF', label: 'RWF - Right Wing Forward' },
    { id: 'AMF', label: 'AMF - Attacking Midfielder' },
    { id: 'LMF', label: 'LMF - Left Midfielder' },
    { id: 'CMF', label: 'CMF - Center Midfielder' },
    { id: 'DMF', label: 'DMF - Defensive Midfielder' },
    { id: 'RMF', label: 'RMF - Right Midfielder' },
    { id: 'LWB', label: 'LWB - Left Wing Back' },
    { id: 'LB', label: 'LB - Left Back' },
    { id: 'CB', label: 'CB - Center Back' },
    { id: 'RB', label: 'RB - Right Back' },
    { id: 'RWB', label: 'RWB - Right Wing Back' },
    { id: 'GK', label: 'GK - Goalkeeper' }
  ],
  volleyball: [
    { id: 'S', label: 'Setter' },
    { id: 'OH', label: 'Outside Hitter' },
    { id: 'OPP', label: 'Opposite Hitter' },
    { id: 'MB', label: 'Middle Blocker' },
    { id: 'L', label: 'Libero' },
    { id: 'DS', label: 'Defensive Specialist' }
  ]
};

const CRICKET_ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'];
const BATTING_STYLES = ['Right-hand', 'Left-hand'];
const BOWLING_STYLES = ['Fast', 'Medium', 'Spin', 'Off-spin', 'Leg-spin', 'None'];

export default function PlayerEntry() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // To hold the actual document ID once verified
  const [validatedRoomId, setValidatedRoomId] = useState('');
  const [roomBudget, setRoomBudget] = useState(10000);

  const [formData, setFormData] = useState({
    game: 'football',
    playerCode: '', // Used for checking
    realName: '',
    nickName: '',
    village: '',
    age: '',
    positions: [],
    foot: 'Right',
    cricketRole: 'Batsman',
    battingStyle: 'Right-hand',
    bowlingStyle: 'None',
    basePrice: null,
    photoFile: null,
    photoURL: ''
  });

  const verifyCode = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const q = query(collection(db, 'rooms'), where('playerCode', '==', formData.playerCode.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setErrorMsg("Invalid Player Code");
        setIsSubmitting(false);
        return;
      }
      
      const roomDoc = snap.docs[0];
      const data = roomDoc.data();
      
      if (data.status === 'live') {
        setErrorMsg("Auction has already started! No new players can join.");
        setIsSubmitting(false);
        return;
      }
      
      setValidatedRoomId(roomDoc.id);
      setRoomBudget(data.budgetPerTeam || 10000);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg("Network Error");
    }
    setIsSubmitting(false);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.playerCode) return;
      await verifyCode();
    } else if (step === 4) {
      setIsSubmitting(true);
      try {
        let finalPhotoURL = '';
        if (formData.photoFile) {
          setUploadingPhoto(true);
          const ext = formData.photoFile.name.split('.').pop();
          const fileName = \`players/\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${ext}\`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, formData.photoFile);
          finalPhotoURL = await getDownloadURL(storageRef);
          setUploadingPhoto(false);
        }

        const playerData = {
          realName: formData.realName,
          nickName: formData.nickName,
          village: formData.village,
          age: Number(formData.age),
          status: 'pending', 
          basePrice: formData.basePrice || 200,
          game: formData.game,
          photoURL: finalPhotoURL,
          createdAt: serverTimestamp()
        };

        if (formData.game === 'football') {
          playerData.foot = formData.foot;
          playerData.positions = formData.positions;
        } else if (formData.game === 'volleyball') {
          playerData.foot = formData.foot; // Handedness mapped to foot
          playerData.positions = formData.positions;
        } else if (formData.game === 'cricket') {
          playerData.cricketRole = formData.cricketRole;
          playerData.battingStyle = formData.battingStyle;
          playerData.bowlingStyle = formData.bowlingStyle;
        }

        await addDoc(collection(db, 'rooms', validatedRoomId, 'players'), playerData);
        setStep(5);
      } catch (error) {
        console.error("Error adding player: ", error);
        alert("Failed to register player.");
      } finally {
        setIsSubmitting(false);
        setUploadingPhoto(false);
      }
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 1) navigate('/');
    else setStep(prev => prev - 1);
  };

  const togglePosition = (posId) => {
    setFormData(prev => {
      const isSelected = prev.positions.includes(posId);
      if (isSelected) {
        return { ...prev, positions: prev.positions.filter(p => p !== posId) };
      }
      if (prev.positions.length >= 3) return prev;
      return { ...prev, positions: [...prev.positions, posId] };
    });
  };

  const renderContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="animate-fade-in delay-100" style={{ padding: '0 1rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>Player Registration</h2>
            
            <div className="input-group">
              <label>Select Game</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {['football', 'cricket', 'volleyball'].map(game => (
                  <button 
                    key={game}
                    className={formData.game === game ? "btn-primary" : "btn-outline"}
                    style={{ padding: '10px 5px', fontSize: '0.9rem', textTransform: 'capitalize' }}
                    onClick={() => setFormData({...formData, game})}
                  >
                    {game}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '2rem' }}>
              <label>Player Entry Code</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="ENTER CODE"
                value={formData.playerCode}
                onChange={e => setFormData({...formData, playerCode: e.target.value.toUpperCase()})}
                style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center', borderColor: errorMsg ? 'red' : '' }}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              />
              {errorMsg && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>{errorMsg}</p>}
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleNext} disabled={!formData.playerCode || isSubmitting}>
              {isSubmitting ? "Verifying..." : "Continue"}
            </button>
          </div>
        );
      case 2:
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'left', padding: '0 1rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Basic Info</h2>
            
            <div className="input-group">
              <label>Real Name *</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Full Name"
                value={formData.realName}
                onChange={e => setFormData({...formData, realName: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>Nickname (Optional)</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Known as in village..."
                value={formData.nickName}
                onChange={e => setFormData({...formData, nickName: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label>Village / City *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="premium-input" 
                  placeholder="Where are you from?"
                  value={formData.village}
                  onChange={e => setFormData({...formData, village: e.target.value})}
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Age *</label>
              <input 
                type="number" 
                className="premium-input" 
                placeholder="Years"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label>Player Photo (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setFormData({...formData, photoFile: e.target.files[0]})}
                className="premium-input"
                style={{ padding: '10px' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Max size 2MB. Square image recommended.</p>
            </div>
            
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }} 
              onClick={handleNext} 
              disabled={!formData.realName || !formData.village || !formData.age}
            >
              Next Step
            </button>
          </div>
        );
      case 3:
        if (formData.game === 'cricket') {
          return (
            <div className="animate-fade-in delay-100" style={{ textAlign: 'left', padding: '0 1rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Cricket Stats</h2>
              
              <div className="input-group">
                <label>Primary Role</label>
                <select className="premium-input" value={formData.cricketRole} onChange={e => setFormData({...formData, cricketRole: e.target.value})}>
                  {CRICKET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Batting Style</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {BATTING_STYLES.map(s => (
                    <button key={s} className={formData.battingStyle === s ? "btn-primary" : "btn-outline"} style={{ flex: 1, padding: '10px' }} onClick={() => setFormData({...formData, battingStyle: s})}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Bowling Style</label>
                <select className="premium-input" value={formData.bowlingStyle} onChange={e => setFormData({...formData, bowlingStyle: e.target.value})}>
                  {BOWLING_STYLES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={handleNext}>Next Step</button>
            </div>
          );
        }

        const positionsList = POSITIONS[formData.game] || POSITIONS.football;
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'left', padding: '0 1rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>{formData.game.charAt(0).toUpperCase() + formData.game.slice(1)} Stats</h2>
            
            <div className="input-group">
              <label>Best Positions ({formData.positions.length}/3)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
                {positionsList.map(pos => (
                  <button
                    key={pos.id}
                    className={formData.positions.includes(pos.id) ? "btn-primary" : "btn-outline"}
                    style={{ padding: '8px 5px', fontSize: '0.75rem', opacity: (!formData.positions.includes(pos.id) && formData.positions.length >= 3) ? 0.5 : 1 }}
                    onClick={() => togglePosition(pos.id)}
                    disabled={!formData.positions.includes(pos.id) && formData.positions.length >= 3}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label>{formData.game === 'volleyball' ? 'Handedness' : 'Strong Foot'}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Left', 'Right', 'Both'].map(foot => (
                  <button key={foot} className={formData.foot === foot ? "btn-primary" : "btn-outline"} style={{ flex: 1, padding: '10px' }} onClick={() => setFormData({...formData, foot})}>{foot}</button>
                ))}
              </div>
            </div>

            <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={handleNext} disabled={formData.positions.length === 0}>Next Step</button>
          </div>
        );
      case 4:
        const b1 = Math.max(10, Math.round((roomBudget * 0.01) / 10) * 10);
        const b2 = Math.max(10, Math.round((roomBudget * 0.03) / 10) * 10);
        const b3 = Math.max(10, Math.round((roomBudget * 0.05) / 10) * 10);
        
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'left', padding: '0 1rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Set Base Price</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '2rem' }}>
              Select your starting bid amount. Higher prices mean fewer teams can afford you, but you guarantee a larger payout if sold!
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { amount: b1, percent: '1%', label: 'Safe & Affordable' },
                { amount: b2, percent: '3%', label: 'Confident' },
                { amount: b3, percent: '5%', label: 'Star Player Premium' }
              ].map(tier => (
                <button
                  key={tier.amount}
                  className={formData.basePrice === tier.amount ? "btn-primary" : "btn-outline"}
                  style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: formData.basePrice === tier.amount ? 'none' : '1px solid var(--border-color)' }}
                  onClick={() => setFormData({...formData, basePrice: tier.amount})}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{tier.label}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Approx {tier.percent} of Team Budget</div>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coins size={18} /> {tier.amount}
                  </div>
                </button>
              ))}

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Custom Base Price</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 15px' }}>
                  <Coins size={18} style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="number" 
                    className="premium-input" 
                    style={{ border: 'none', background: 'transparent' }}
                    value={formData.basePrice}
                    onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})}
                    placeholder="e.g. 200"
                  />
                </div>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '2rem' }} 
              onClick={handleNext} 
              disabled={!formData.basePrice || isSubmitting}
            >
              {isSubmitting ? (uploadingPhoto ? "Uploading Photo..." : "Registering...") : "Complete Registration"}
            </button>
          </div>
        );
      case 5:
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 255, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={40} color="#00ff88" />
              </div>
            </div>
            
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#00ff88' }}>Registered!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
              Welcome to the auction, <strong>{formData.realName}</strong>. You are now in the pending pool.
            </p>
            
            <button className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => navigate('/')}>
              Return Home
            </button>
            <button className="btn-outline" style={{ width: '100%' }} onClick={() => {
              setStep(2);
              setFormData({...formData, realName: '', nickName: '', age: '', photoFile: null});
            }}>
              <UserPlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Register Another Player
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
      
      {step < 5 && (
        <header style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--primary)', width: \`\${(step / 4) * 100}%\`, transition: 'width 0.3s' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Step {step} of 4
            </p>
          </div>
        </header>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem 1rem', textAlign: 'center', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0, 212, 255, 0.3)' }}>
            <UserPlus size={28} color="#000" />
          </div>

          <div style={{ marginTop: '20px' }}>
            {renderContent()}
          </div>
          
        </div>
      </main>

    </div>
  );
}
`;
fs.writeFileSync('src/pages/PlayerEntry.jsx', content);
