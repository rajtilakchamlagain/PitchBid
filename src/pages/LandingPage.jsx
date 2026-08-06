import { useNavigate } from 'react-router-dom';
import { User, Crown, Eye, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex-center container">
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', textAlign: 'center', padding: '1rem' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '1rem', lineHeight: '1.2' }} className="text-gradient">
          PITCHBID
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', marginBottom: '3rem' }}>
          The ultimate draft arena for local legends.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div 
            className="glass-panel delay-100" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1.5rem' }}
            onClick={() => navigate('/player-entry')}
          >
            <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '1.5rem', borderRadius: '50%' }}>
              <User size={48} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.8rem' }}>Enter as Player</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              Register for the upcoming auction. Set your stats and preferred positions.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <span className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                Register Now <ArrowRight size={20} />
              </span>
            </div>
          </div>

          <div 
            className="glass-panel delay-200" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1.5rem' }}
            onClick={() => navigate('/owner-entry')}
          >
            <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '1.5rem', borderRadius: '50%' }}>
              <Crown size={48} color="var(--secondary)" />
            </div>
            <h2 style={{ fontSize: '1.8rem' }}>Enter as Owner</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              Take the podium. Bid on talents, manage your budget, and build the ultimate squad.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <span className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(135deg, var(--secondary), #00ff88)' }}>
                Access Podium <ArrowRight size={20} />
              </span>
            </div>
          </div>

          <div 
            className="glass-panel delay-300" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1.5rem' }}
            onClick={() => navigate('/viewer-entry')}
          >
            <div style={{ background: 'rgba(255, 0, 128, 0.1)', padding: '1.5rem', borderRadius: '50%' }}>
              <Eye size={48} color="#ff0080" />
            </div>
            <h2 style={{ fontSize: '1.8rem' }}>Enter as Viewer</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              Watch the live auction unfold in real-time. Chat with friends and send reactions.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <span className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(135deg, #ff0080, #ff8c00)' }}>
                Watch Live <ArrowRight size={20} />
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
