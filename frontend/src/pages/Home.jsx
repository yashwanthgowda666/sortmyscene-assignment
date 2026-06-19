import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

// real concert/event photos, matched to the seeded events
const EVENT_IMAGES = [
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop&q=80', // festival crowd
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&q=80', // concert stage purple
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop&q=80', // DJ night lights
];

const EVENT_TAGS = ['CONCERT', 'LIVE MUSIC', 'FESTIVAL'];

function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getEvents();
        setEvents(res.data);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen" style={{ background: '#08080F' }}>

      {/* Navbar */}
      <nav style={{ background: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(124,58,237,0.2)' }}
        className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>
            SortMyScene
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm" style={{ color: '#6B7280' }}>
            Hey, <span className="text-white font-medium">{user?.name}</span>
          </span>
          <button onClick={handleLogout}
            className="text-sm px-4 py-1.5 rounded-lg transition-all"
            style={{ color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }}
            onMouseEnter={e => e.target.style.background = 'rgba(168,85,247,0.1)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}>
            Logout
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="px-6 pt-14 pb-10 max-w-6xl mx-auto">
        <div className="mb-2">
          <span className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: '#A855F7' }}>
            Mumbai's Nightlife
          </span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 leading-tight"
          style={{ fontFamily: 'Space Grotesk' }}>
          Discover Live<br />
          <span style={{ background: 'linear-gradient(90deg, #A855F7, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Experiences
          </span>
        </h1>
        <p className="text-base" style={{ color: '#6B7280' }}>
          Book seats for the best concerts, clubs, and festivals in Mumbai.
        </p>
      </div>

      {/* Events Grid */}
      <div className="px-6 pb-16 max-w-6xl mx-auto">

        {loading && (
          <div className="text-center py-20" style={{ color: '#6B7280' }}>
            Loading events...
          </div>
        )}

        {error && (
          <div className="text-center py-20" style={{ color: '#F87171' }}>{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <div key={event._id}
              onClick={() => navigate(`/events/${event._id}`)}
              className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300"
              style={{
                background: '#0F0F1A',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = '1px solid rgba(168,85,247,0.4)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(124,58,237,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>

              {/* Banner with real photo */}
              <div className="h-36 relative overflow-hidden">
                <img
                  src={EVENT_IMAGES[index % EVENT_IMAGES.length]}
                  alt={event.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* dark gradient overlay so tag + text stay readable */}
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, rgba(8,8,15,0.1) 0%, rgba(8,8,15,0.75) 100%)' }} />
                <span className="absolute bottom-4 left-4 text-xs font-bold tracking-widest px-2 py-1 rounded"
                  style={{ background: 'rgba(0,0,0,0.5)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.4)' }}>
                  {EVENT_TAGS[index % EVENT_TAGS.length]}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-3 leading-snug"
                  style={{ fontFamily: 'Space Grotesk' }}>
                  {event.name}
                </h3>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(event.date)} • {formatTime(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <span>{event.totalSeats} seats available</span>
                  </div>
                </div>

                <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                    color: 'white',
                  }}>
                  Book Seats →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;