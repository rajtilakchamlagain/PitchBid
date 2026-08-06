import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, UserPlus, Trophy, MapPin } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const POSITIONS = [
  { id: 'CF', label: 'CF - Center Forward' },
  { id: 'SS', label: 'SS - Second Striker' },
  { id: 'LWF', label: 'LWF - Left Wing Forward' },
  { id: 'RWF', label: 'RWF - Right Wing Forward' },
  { id: 'LMF', label: 'LMF - Left Midfielder' },
  { id: 'CMF', label: 'CMF - Center Midfielder' },
  { id: 'DMF', label: 'DMF - Defensive Midfielder' },
  { id: 'RMF', label: 'RMF - Right Midfielder' },
  { id: 'LB', label: 'LB - Left Back' },
  { id: 'CB', label: 'CB - Center Back' },
  { id: 'RB', label: 'RB - Right Back' },
  { id: 'GK', label: 'GK - Goalkeeper' }
];

export default function PlayerEntry() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // To hold the actual document ID once verified
  const [validatedRoomId, setValidatedRoomId] = useState('');

  const [formData, setFormData] = useState({
    game: 'football',
    playerCode: '', // Used for checking
    realName: '',
    nickName: '',
    village: '',
    age: '',
    positions: [],
    foot: 'Right'
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
    } else if (step === 3) {
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'rooms', validatedRoomId, 'players'), {
          realName: formData.realName,
          nickName: formData.nickName,
          village: formData.village,
          age: Number(formData.age),
          foot: formData.foot,
          positions: formData.positions,
          status: 'pending', 
          basePrice: 500,
          createdAt: serverTimestamp()
        });
        setStep(4);
      } catch (error) {
        console.error("Error adding player: ", error);
        alert("Failed to register player.");
      } finally {
        setIsSubmitting(false);
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
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'left', padding: '0 1rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Game Stats</h2>
            
            <div className="input-group">
              <label>Best 3 Positions ({formData.positions.length}/3)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
                {POSITIONS.map(pos => (
                  <button
                    key={pos.id}
                    className={formData.positions.includes(pos.id) ? "btn-primary" : "btn-outline"}
                    style={{ 
                      padding: '8px 5px', 
                      fontSize: '0.75rem',
                      opacity: (!formData.positions.includes(pos.id) && formData.positions.length >= 3) ? 0.5 : 1
                    }}
                    onClick={() => togglePosition(pos.id)}
                    disabled={!formData.positions.includes(pos.id) && formData.positions.length >= 3}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label>Strong Foot</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Left', 'Right', 'Both'].map(foot => (
                  <button 
                    key={foot}
                    className={formData.foot === foot ? "btn-primary" : "btn-outline"}
                    style={{ flex: 1, padding: '10px' }}
                    onClick={() => setFormData({...formData, foot})}
                  >
                    {foot}
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem', width: '100%' }} 
              onClick={handleNext} 
              disabled={formData.positions.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Profile"}
            </button>
          </div>
        );
      case 4:
        return (
          <div className="animate-fade-in delay-100 text-center" style={{ padding: '0 1rem' }}>
            <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={48} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Registered!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Your profile has been submitted to the draft pool. The auctioneer will pull your name during the live event.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary)' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>{formData.realName}</h3>
              <p style={{ color: 'var(--primary)', marginTop: '5px' }}>{formData.positions.join(', ')}</p>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex-center container">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem 1rem', textAlign: 'center', position: 'relative' }}>
        {step < 4 && (
          <button 
            className="btn-outline" 
            style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '8px 16px', fontSize: '0.9rem', border: 'none' }}
            onClick={handleBack}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        
        <div style={{ paddingTop: '2rem' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
