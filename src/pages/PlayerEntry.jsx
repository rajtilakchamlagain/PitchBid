import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, UserPlus, Trophy } from 'lucide-react';

export default function PlayerEntry() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    game: 'football',
    roomCode: '',
    realName: '',
    nickName: '',
    age: '',
    positions: '',
    foot: 'Right'
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => {
    if (step === 1) navigate('/');
    else setStep(prev => prev - 1);
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
                placeholder="e.g. AUCTION2026"
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
              <label>Real Name</label>
              <input type="text" className="premium-input" value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value})} placeholder="Full Name" />
            </div>
            <div className="input-group">
              <label>Nick Name (Optional)</label>
              <input type="text" className="premium-input" value={formData.nickName} onChange={e => setFormData({...formData, nickName: e.target.value})} placeholder="e.g. Messi of the village" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Age</label>
                <input type="number" className="premium-input" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="Years" />
              </div>
              <div className="input-group">
                <label>Preferred Foot</label>
                <select className="premium-input" value={formData.foot} onChange={e => setFormData({...formData, foot: e.target.value})} style={{ backgroundColor: 'var(--bg-darker)' }}>
                  <option>Right</option>
                  <option>Left</option>
                  <option>Both</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Best 3 Positions</label>
              <input type="text" className="premium-input" value={formData.positions} onChange={e => setFormData({...formData, positions: e.target.value})} placeholder="e.g. LB, CB, LMF" />
            </div>
            <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={handleNext} disabled={!formData.realName || !formData.positions}>
              Submit Profile
            </button>
          </div>
        );
      case 4:
        return (
          <div className="animate-fade-in delay-100" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={64} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Player Registered!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              {formData.nickName || formData.realName} has been added to the draft pool.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="btn-outline" 
                onClick={() => {
                  setFormData({...formData, realName: '', nickName: '', age: '', positions: '', foot: 'Right'});
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '3rem' }}>
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
