import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function ChessPlayerEntry() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [validatedRoomId, setValidatedRoomId] = useState(null);
  
  const [formData, setFormData] = useState({
    playerCode: '',
    name: '',
    rating: '',
    collegeName: '',
    rollNumber: '',
    address: '',
    isCoreMember: 'No',
    designation: '',
    fideId: '',
    aicfId: ''
  });

  const verifyCode = async () => {
    if (!formData.playerCode) return;
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const q = query(collection(db, 'chess_tournaments'), where('playerCode', '==', formData.playerCode.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setErrorMsg("Invalid Tournament Code");
        setIsLoading(false);
        return;
      }
      
      const roomDoc = snap.docs[0];
      const data = roomDoc.data();
      
      if (data.status !== 'waiting') {
        setErrorMsg("Tournament has already started! Registration is closed.");
        setIsLoading(false);
        return;
      }
      
      setValidatedRoomId(roomDoc.id);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error verifying code.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitRegistration = async () => {
    if (!formData.name || !formData.collegeName || !formData.rollNumber || !formData.address) {
      setErrorMsg("Please fill in all compulsory fields.");
      return;
    }
    
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'chess_tournaments', validatedRoomId, 'players'), {
        name: formData.name,
        rating: formData.rating ? Number(formData.rating) : 1200,
        collegeName: formData.collegeName,
        rollNumber: formData.rollNumber,
        address: formData.address,
        isCoreMember: formData.isCoreMember,
        designation: formData.isCoreMember === 'Yes' ? formData.designation : '',
        fideId: formData.fideId,
        aicfId: formData.aicfId,
        wins: 0,
        matchesPlayed: 0,
        whitePlayed: 0,
        blackPlayed: 0,
        colorHistory: [], // e.g., ['w', 'b', 'b']
        createdAt: serverTimestamp()
      });
      setStep(3);
    } catch (err) {
      console.error(err);
      alert("Failed to register.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-color)', color: 'var(--text-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        
        <button onClick={() => step === 1 ? navigate('/') : setStep(step - 1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> Back
        </button>

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Users size={24} color="#00e5ff" /> Join Chess Tournament
            </h2>
            
            <div className="input-group">
              <label>Tournament Code</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="ENTER CODE"
                value={formData.playerCode}
                onChange={e => setFormData({...formData, playerCode: e.target.value.toUpperCase()})}
                style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center', borderColor: errorMsg ? 'red' : '' }}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
              />
              {errorMsg && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>{errorMsg}</p>}
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '1rem', border: 'none' }} 
              onClick={verifyCode} 
              disabled={isLoading || !formData.playerCode}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>Player Details</h2>
            
            <div className="input-group">
              <label>Your Name *</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Magnus Carlsen"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>College Name *</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Enter your college name"
                value={formData.collegeName}
                onChange={e => setFormData({...formData, collegeName: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>Roll Number *</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Enter your roll number"
                value={formData.rollNumber}
                onChange={e => setFormData({...formData, rollNumber: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>Hostel / PG Name (Address) *</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="e.g. Block A, Room 101"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>Are you a Core Member? *</label>
              <select 
                className="premium-input" 
                value={formData.isCoreMember}
                onChange={e => setFormData({...formData, isCoreMember: e.target.value})}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            
            {formData.isCoreMember === 'Yes' && (
              <div className="input-group">
                <label>Designation *</label>
                <input 
                  type="text" 
                  className="premium-input" 
                  placeholder="e.g. Event Coordinator"
                  value={formData.designation}
                  onChange={e => setFormData({...formData, designation: e.target.value})}
                />
              </div>
            )}
            
            <div className="input-group">
              <label>FIDE/Online Rating (Optional)</label>
              <input 
                type="number" 
                className="premium-input" 
                placeholder="e.g. 1500"
                value={formData.rating}
                onChange={e => setFormData({...formData, rating: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>FIDE ID (Optional)</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="e.g. 1234567"
                value={formData.fideId}
                onChange={e => setFormData({...formData, fideId: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>AICF ID (Optional)</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="e.g. 987654"
                value={formData.aicfId}
                onChange={e => setFormData({...formData, aicfId: e.target.value})}
              />
            </div>
            
            {errorMsg && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>{errorMsg}</p>}

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '1rem', border: 'none' }} 
              onClick={submitRegistration} 
              disabled={isLoading || !formData.name || !formData.collegeName || !formData.rollNumber || !formData.address || (formData.isCoreMember === 'Yes' && !formData.designation)}
            >
              {isLoading ? 'Registering...' : 'Register for Tournament'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--success)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={30} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--text-muted)' }}>You are now registered for the tournament. Wait for the host to generate the first round pairings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
