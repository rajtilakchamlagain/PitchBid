import { useNavigate } from 'react-router-dom';
import { User, Crown, Trophy, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex-center container">
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }} className="text-gradient">
          PITCHBID
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '4rem' }}>
          The ultimate draft arena for local legends.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          <div 
            className="glass-panel delay-100" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 2rem' }}
            onClick={() => navigate('/player-entry')}
          >
            <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '1.5rem', borderRadius: '50%' }}>
              <User size={48} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '2rem' }}>Enter as Player</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              Register yourself or your teammates for the upcoming auction. Set your stats and preferred positions.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <span className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                Register Now <ArrowRight size={20} />
              </span>
            </div>
          </div>

          <div 
            className="glass-panel delay-200" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 2rem' }}
            onClick={() => navigate('/owner-entry')}
          >
            <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '1.5rem', borderRadius: '50%' }}>
              <Crown size={48} color="var(--secondary)" />
            </div>
            <h2 style={{ fontSize: '2rem' }}>Enter as Owner</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              Take the podium. Bid on the best talents, manage your budget, and build the ultimate squad.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <span className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(135deg, var(--secondary), #00ff88)' }}>
                Access Podium <ArrowRight size={20} />
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
