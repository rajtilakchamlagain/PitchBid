import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Eye, ArrowRight, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      background: '#ffffff', 
      color: '#09090b', 
      minHeight: '100vh', 
      width: '100%', 
      position: 'absolute', 
      top: 0, 
      left: 0,
      overflowY: 'auto',
      fontFamily: '"Inter", sans-serif'
    }}>
      
      {/* Premium Header */}
      <header style={{ 
        padding: '1.5rem 4rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, #000 0%, #333 100%)', padding: '8px', borderRadius: '8px' }}>
            <Trophy size={20} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.03em' }}>PitchBid</h1>
        </div>
        
        <nav style={{ display: 'flex', gap: '2rem', fontWeight: '500', fontSize: '0.95rem', color: '#666' }}>
          <span style={{ cursor: 'pointer', color: '#000' }}>Features</span>
          <span style={{ cursor: 'pointer' }}>Pro</span>
          <span style={{ cursor: 'pointer' }}>Enterprise</span>
        </nav>
      </header>

      {/* Hero Section */}
      <div style={{ 
        padding: '6rem 2rem', 
        textAlign: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto',
        position: 'relative'
      }}>
        
        {/* Decorative Gradients */}
        <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.15) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.04)', padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '2rem', border: '1px solid rgba(0,0,0,0.05)' }}>
            ✨ Introducing PitchBid 2.0 Tactical Engine
          </div>
          
          <h1 style={{ fontSize: '5.5rem', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-0.04em', marginBottom: '1.5rem', color: '#000' }}>
            The Ultimate <br/>
            <span style={{ background: 'linear-gradient(135deg, #0055ff 0%, #00e5ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Franchise Manager
            </span>
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: '#555', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: '1.6' }}>
            Experience the world's most advanced live auction broadcast platform. Draft players, build your squad, and dominate the tactical pitch.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/owner-entry')}
              style={{ 
                background: '#000', color: '#fff', padding: '1.2rem 2.5rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <ShieldCheck size={20} /> Host / Join as Owner
            </button>
            
            <button 
              onClick={() => navigate('/player-entry')}
              style={{ 
                background: '#fff', color: '#000', padding: '1.2rem 2.5rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Users size={20} /> Register as Player
            </button>
            
            <button 
              onClick={() => navigate('/viewer-entry')}
              style={{ 
                background: 'transparent', color: '#666', padding: '1.2rem 2rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#000'}
              onMouseLeave={e => e.currentTarget.style.color = '#666'}
            >
              <Eye size={20} /> Watch Live Stream <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Chess Module Section */}
      <div style={{ 
        padding: '6rem 2rem', 
        textAlign: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto',
        position: 'relative',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '32px',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.02)'
      }}>
        
        <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '2rem' }}>
          ♞ NEW: Chess Tournament Manager
        </div>
        
        <h2 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-0.04em', marginBottom: '1.5rem', color: '#000' }}>
          Swiss & Knockout <br/>
          <span style={{ background: 'linear-gradient(135deg, #ff0080 0%, #ff8c00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Pairing Engine
          </span>
        </h2>
        
        <p style={{ fontSize: '1.15rem', color: '#555', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: '1.6' }}>
          Host professional chess tournaments. Automatically generate Swiss pairings, track colors, record wins, and manage leaderboards in real-time.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/chess-owner-entry')}
            style={{ 
              background: '#000', color: '#fff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '600', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <ShieldCheck size={18} /> Host Tournament
          </button>
          
          <button 
            onClick={() => navigate('/chess-player-entry')}
            style={{ 
              background: '#fff', color: '#000', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '600', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Users size={18} /> Join as Player
          </button>
          
          <button 
            onClick={() => navigate('/chess-viewer-entry')}
            style={{ 
              background: 'transparent', color: '#666', padding: '1rem 1.5rem', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '600', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#000'}
            onMouseLeave={e => e.currentTarget.style.color = '#666'}
          >
            <Eye size={18} /> Watch Live <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#fff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
            <Zap size={24} color="#0055ff" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.75rem' }}>Real-Time Engine</h3>
          <p style={{ color: '#666', lineHeight: '1.6' }}>Ultra-low latency Firebase WebSockets power the live broadcast, pushing bids and animations in milliseconds.</p>
        </div>

        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#fff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
            <BarChart3 size={24} color="#00e5ff" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.75rem' }}>Tactical Pitch Builder</h3>
          <p style={{ color: '#666', lineHeight: '1.6' }}>Drag and drop your drafted players onto a dynamic 2D pitch. Set formations and assign Captain roles.</p>
        </div>

        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#fff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
            <Users size={24} color="#ff0080" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.75rem' }}>Live Interactions</h3>
          <p style={{ color: '#666', lineHeight: '1.6' }}>Viewers can send floating emojis and chat in real-time, bringing massive hype to the drafting process.</p>
        </div>

      </div>
    </div>
  );
}
