import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, Clock, AlertTriangle } from 'lucide-react';

export default function AuctionRoom() {
  const navigate = useNavigate();
  
  // Mock Data for the auction
  const [currentPlayer, setCurrentPlayer] = useState({
    id: 1,
    realName: 'Rahul Tiwari',
    nickName: 'The Wall',
    age: 24,
    positions: 'CB, DMF',
    foot: 'Right',
    basePrice: 500,
    photoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=300&auto=format&fit=crop'
  });

  const [currentBid, setCurrentBid] = useState(500);
  const [highestBidder, setHighestBidder] = useState('None');
  const [timeLeft, setTimeLeft] = useState(15);
  
  // Mock Owners
  const [owners, setOwners] = useState([
    { id: 'O1', name: 'Spartans FC', budget: 10000, color: 'var(--primary)' },
    { id: 'O2', name: 'Velocity United', budget: 10000, color: 'var(--secondary)' }
  ]);

  const handleBid = (ownerId, amount) => {
    const owner = owners.find(o => o.id === ownerId);
    if (owner.budget >= (currentBid + amount)) {
      setCurrentBid(prev => prev + amount);
      setHighestBidder(owner.name);
      setTimeLeft(15); // Reset timer on bid
    }
  };

  return (
    <div className="min-h-screen" style={{ padding: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn-outline" style={{ padding: '8px 16px', border: 'none' }} onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Exit Room
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 50, 50, 0.2)', padding: '5px 10px', borderRadius: '8px', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', animation: 'pulse 2s infinite' }} />
            LIVE AUCTION
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Main Stage (Player Card) */}
        <div className="glass-panel animate-fade-in" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(180deg, rgba(0,255,136,0.1) 0%, transparent 100%)', zIndex: 0 }} />
          
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', zIndex: 1 }}>On The Block</h2>
          
          <div style={{ marginTop: '2rem', display: 'flex', gap: '3rem', alignItems: 'center', zIndex: 1, width: '100%' }}>
            
            <div style={{ width: '250px', height: '350px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              <img src={currentPlayer.photoUrl} alt="Player" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '4rem', lineHeight: '1.1', marginBottom: '0.5rem' }} className="text-gradient">
                {currentPlayer.realName}
              </h1>
              {currentPlayer.nickName && (
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '2rem' }}>
                  "{currentPlayer.nickName}"
                </h3>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Positions</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentPlayer.positions}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Age</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentPlayer.age}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Strong Foot</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentPlayer.foot}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                  <p style={{ color: 'var(--primary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Base Price</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Coins size={20} /> {currentPlayer.basePrice}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bidding Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel animate-fade-in delay-100" style={{ textAlign: 'center', padding: '2rem', border: '1px solid var(--secondary)', boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)' }}>
            <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Bid</p>
            <h1 style={{ fontSize: '4.5rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Coins size={40} /> {currentBid}
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginTop: '1rem' }}>
              Highest Bidder: <span style={{ fontWeight: 'bold', color: highestBidder !== 'None' ? 'var(--primary)' : 'var(--text-muted)' }}>{highestBidder}</span>
            </p>
            
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: timeLeft <= 5 ? '#ff4444' : 'var(--text-main)', fontSize: '2rem', fontWeight: 'bold' }}>
              <Clock size={30} /> 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>

          <div className="glass-panel animate-fade-in delay-200" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Owners Dashboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {owners.map(owner => (
                <div key={owner.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', borderLeft: `4px solid ${owner.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{owner.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                      <Coins size={16} /> {owner.budget} left
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.9rem', borderColor: owner.color, color: owner.color }} onClick={() => handleBid(owner.id, 100)}>
                      +100
                    </button>
                    <button className="btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.9rem', borderColor: owner.color, color: owner.color }} onClick={() => handleBid(owner.id, 500)}>
                      +500
                    </button>
                    <button className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: owner.color }} onClick={() => handleBid(owner.id, 1000)}>
                      +1000
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
