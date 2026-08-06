import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, UserPlus, Trophy, MapPin } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const [formData, setFormData] = useState({
    game: 'football',
    roomCode: '',
    realName: '',
    nickName: '',
    village: '',
    age: '',
    positions: [], // Array of up to 3 position IDs
    foot: 'Right'
  });

  const handleNext = async () => {
    if (step === 3) {
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'rooms', formData.roomCode, 'players'), {
          realName: formData.realName,
          nickName: formData.nickName,
          village: formData.village,
          age: Number(formData.age),
          foot: formData.foot,
          positions: formData.positions,
          status: 'pending', // 'pending', 'active', 'sold', 'unsold'
          basePrice: 500, // Default base price
          createdAt: serverTimestamp()
        });
        setStep(4);
      } catch (error) {
        console.error("Error adding player: ", error);
        alert("Failed to register player. Please check the room code.");
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
      } else {
        if (prev.positions.length >= 3) return prev; // Max 3 positions
        return { ...prev, positions: [...prev.positions, posId] };
      }
    });
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="animate-fade-in delay-100">
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Select Sport</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div 
                className="glass-panel" 
                style={{ cursor: 'pointer', border: '1px solid var(--primary)' }}
                onClick={() => setFormData({...formData, game: 'football'})}
              >
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trophy size={24} color="var(--primary)"/> Football (Active)
                </h3>
              </div>
              <div className="glass-panel" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <h3>Cricket (Coming Soon)</h3>
              </div>
              <div className="glass-panel" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <h3>Volleyball (Coming Soon)</h3>
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: '2rem', width: '100%' }} onClick={handleNext}>
              Continue
            </button>
          </div>
        );
      case 2:
        return (
          <div className="animate-fade-in delay-100">
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Enter Room Code</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Ask your auction host for the secret room code.</p>
            <div className="input-group">
              <label>Room Code</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="e.g. ROOM-X7B9"
                value={formData.roomCode}
                onChange={e => setFormData({...formData, roomCode: e.target.value.toUpperCase()})}
                style={{ fontSize: '1.5rem', letterSpacing: '0.2em', textAlign: 'center' }}
              />
            </div>
            <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={handleNext} disabled={!formData.roomCode}>
              Join Room
            </button>
          </div>
        );
      case 3:
        return (
          <div className="animate-fade-in delay-100">
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Player Profile</h2>
            
            <div className="input-group">
              <label>Real Name *</label>
              <input type="text" className="premium-input" value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value})} placeholder="Full Name" />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Nick Name (Optional)</label>
                <input type="text" className="premium-input" value={formData.nickName} onChange={e => setFormData({...formData, nickName: e.target.value})} placeholder="e.g. Messi" />
              </div>
              <div className="input-group">
                <label>Village / City *</label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input type="text" className="premium-input" style={{ paddingLeft: '40px', width: '100%' }} value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} placeholder="Your Village" />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Age *</label>
                <input type="number" className="premium-input" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="Years" />
              </div>
              <div className="input-group">
                <label>Preferred Foot *</label>
                <select className="premium-input" value={formData.foot} onChange={e => setFormData({...formData, foot: e.target.value})} style={{ backgroundColor: 'var(--bg-darker)' }}>
                  <option>Right</option>
                  <option>Left</option>
                  <option>Both</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Best Positions * (Select up to 3)</span>
                <span style={{ color: formData.positions.length === 3 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {formData.positions.length} / 3
                </span>
              </label>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '8px',
                background: 'rgba(0,0,0,0.2)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {POSITIONS.map(pos => {
                  const isSelected = formData.positions.includes(pos.id);
                  const isDisabled = !isSelected && formData.positions.length >= 3;
                  return (
                    <div 
                      key={pos.id}
                      onClick={() => !isDisabled && togglePosition(pos.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? 'var(--bg-darker)' : 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                      }}
                    >
                      {pos.label}
                    </div>
                  )
                })}
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem', width: '100%' }} 
              onClick={handleNext} 
              disabled={!formData.realName || !formData.village || !formData.age || formData.positions.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Profile"}
            </button>
          </div>
        );
      case 4:
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={64} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Player Registered!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              {formData.nickName || formData.realName} from {formData.village} has been added to the draft pool.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="btn-outline" 
                onClick={() => {
                  setFormData({...formData, realName: '', nickName: '', age: '', positions: [], village: '', foot: 'Right'});
                  setStep(3);
                }}
              >
                <UserPlus size={20} /> Add Another Player
              </button>
              <button className="btn-primary" onClick={() => navigate('/')}>
                Return Home
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex-center container">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '3rem' }}>
        <button 
          className="btn-outline" 
          style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: '2rem', border: 'none' }}
          onClick={handleBack}
        >
          <ArrowLeft size={16} /> Back
        </button>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              style={{ 
                height: '4px', 
                flex: 1, 
                backgroundColor: s <= step ? 'var(--primary)' : 'var(--glass-border)',
                borderRadius: '2px',
                transition: 'background-color 0.3s ease'
              }} 
            />
          ))}
        </div>

        {renderStep()}
      </div>
    </div>
  );
}
