import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function ViewerEntry() {
  const navigate = useNavigate();
  const [viewerCode, setViewerCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async () => {
    if (viewerCode.length < 4 || !nickname) {
      setError(true);
      setErrorMsg(!nickname ? "Enter a Nickname for chat" : "Code too short");
      setTimeout(() => setError(false), 2000);
      return;
    }

    setIsLoading(true);
    try {
      const q = query(collection(db, 'rooms'), where('viewerCode', '==', viewerCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const roomDoc = querySnapshot.docs[0];
        localStorage.setItem('pitchbid_viewer_name', nickname);
        navigate(`/viewer-room?room=${roomDoc.id}`); // URL uses document ID for DB queries, but it's safe since it's read-only for viewers
      } else {
        setError(true);
        setErrorMsg("Tournament not found");
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      console.error(err);
      setError(true);
      setErrorMsg("Network error");
      setTimeout(() => setError(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex-center container">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center', position: 'relative' }}>
        <button 
          className="btn-outline" 
          style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', padding: '6px 12px', fontSize: '0.9rem', border: 'none' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} /> Back
        </button>
        
        <div style={{ background: 'rgba(255, 0, 128, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-block', margin: '1rem 0' }}>
          <Eye size={40} color="#ff0080" />
        </div>
        
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Join as Viewer</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Watch the auction live and chat.</p>
        
        <div className="input-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
          <label>Chat Nickname</label>
          <input 
            type="text" 
            className="premium-input" 
            placeholder="e.g. FootballFan99"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
        </div>

        <div className="input-group" style={{ textAlign: 'left' }}>
          <label>Viewer Code</label>
          <input 
            type="text" 
            className="premium-input" 
            placeholder="VIEWER CODE"
            value={viewerCode}
            onChange={e => setViewerCode(e.target.value.toUpperCase())}
            style={{ 
              fontSize: '1.5rem', 
              letterSpacing: '0.3em', 
              textAlign: 'center',
              borderColor: error ? 'red' : 'var(--border-color)',
              textTransform: 'uppercase'
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          {error && <span style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', display: 'block' }}>{errorMsg}</span>}
        </div>
        
        <button className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', backgroundImage: 'linear-gradient(135deg, #ff0080, #ff8c00)' }} onClick={handleJoin} disabled={!viewerCode || !nickname || isLoading}>
          {isLoading ? "Connecting..." : "Enter Live Stream"}
        </button>
      </div>
    </div>
  );
}
