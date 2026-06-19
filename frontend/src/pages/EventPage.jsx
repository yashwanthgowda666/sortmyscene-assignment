

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, reserveSeats, confirmBooking, cancelReservation } from '../services/api';

import Logo from '../components/Logo';

const ROWS = ['A', 'B', 'C', 'D', 'E'];

function EventPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // unique per event AND per logged in user, so two accounts on the same
    // browser never see or restore each other's reservation
    const reservationKey = `reservation_${id}_${localStorage.getItem('token')}`;

    const [event, setEvent] = useState(null);
    const [seats, setSeats] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [reservationId, setReservationId] = useState(() => {
        const saved = localStorage.getItem(reservationKey);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return new Date(parsed.expiresAt) > new Date() ? parsed.reservationId : null;
    });
    const [expiresAt, setExpiresAt] = useState(() => {
        const saved = localStorage.getItem(reservationKey);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return new Date(parsed.expiresAt) > new Date() ? parsed.expiresAt : null;
    });
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reserving, setReserving] = useState(false);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingRef, setBookingRef] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await getEventById(id);
                setEvent(res.data.event);
                setSeats(res.data.seats);

                const saved = localStorage.getItem(reservationKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (new Date(parsed.expiresAt) > new Date()) {
                        setSelectedSeats(parsed.selectedSeats || []);
                    }
                }
            } catch (err) {
                setError('Failed to load event');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => {
            const secondsLeft = Math.floor((new Date(expiresAt) - new Date()) / 1000);
            if (secondsLeft <= 0) {
                setTimeLeft(0);
                setReservationId(null);
                setExpiresAt(null);
                localStorage.removeItem(reservationKey);
                setSeats(prev =>
                    prev.map(seat =>
                        selectedSeats.includes(seat._id)
                            ? { ...seat, status: 'available' }
                            : seat
                    )
                );
                setSelectedSeats([]);
                clearInterval(interval);
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    const formatDateTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
        });
    };

    const getSeatsInRow = (rowIndex) => {
        const seatsPerRow = Math.ceil(seats.length / ROWS.length);
        return seats.slice(rowIndex * seatsPerRow, (rowIndex + 1) * seatsPerRow);
    };

    const handleSeatClick = (seat) => {
        if (seat.status === 'reserved' || seat.status === 'booked') return;
        if (reservationId) return;
        setSelectedSeats(prev =>
            prev.includes(seat._id)
                ? prev.filter(s => s !== seat._id)
                : [...prev, seat._id]
        );
    };

    const getSeatStyle = (seat) => {
        if (seat.status === 'booked') return {
            background: '#EF4444', cursor: 'not-allowed', boxShadow: 'none'
        };
        if (seat.status === 'reserved' && !selectedSeats.includes(seat._id)) return {
            background: '#F59E0B', cursor: 'not-allowed', boxShadow: 'none'
        };
        if (selectedSeats.includes(seat._id)) return {
            background: '#7C3AED',
            cursor: 'pointer',
            boxShadow: '0 0 12px 3px rgba(124,58,237,0.7)',
        };
        return {
            background: '#1a2e1a',
            border: '1px solid #22C55E',
            cursor: 'pointer',
        };
    };

    const handleReserve = async () => {
        if (selectedSeats.length === 0) {
            setError('Pick at least one seat first');
            return;
        }
        setError('');
        setReserving(true);
        try {
            const res = await reserveSeats({ eventId: id, seatIds: selectedSeats });
            setReservationId(res.data.reservationId);
            setExpiresAt(res.data.expiresAt);
            localStorage.setItem(reservationKey, JSON.stringify({
                reservationId: res.data.reservationId,
                expiresAt: res.data.expiresAt,
                selectedSeats,
            }));
            setSeats(prev =>
                prev.map(seat =>
                    selectedSeats.includes(seat._id)
                        ? { ...seat, status: 'reserved' }
                        : seat
                )
            );
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reserve, try again');
            const res = await getEventById(id);
            setSeats(res.data.seats);
            setSelectedSeats([]);
        } finally {
            setReserving(false);
        }
    };

    const handleCancel = async () => {
        if (reservationId) {
            try {
                await cancelReservation(reservationId);
            } catch (err) {
                console.error('Cancel failed:', err);
            }
            localStorage.removeItem(reservationKey);
            setReservationId(null);
            setExpiresAt(null);
            setSelectedSeats([]);
            const res = await getEventById(id);
            setSeats(res.data.seats);
            return;
        }
        navigate('/');
    };

    const handleConfirmBooking = async () => {
        setError('');
        setBooking(true);
        try {
            await confirmBooking({ reservationId });
            const ref = 'SMS-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            setBookingRef(ref);
            setBookingSuccess(true);
            setReservationId(null);
            setExpiresAt(null);
            setSelectedSeats([]);
            localStorage.removeItem(reservationKey);
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed');
        } finally {
            setBooking(false);
        }
    };

    const selectedSeatNumbers = seats
        .filter(s => selectedSeats.includes(s._id))
        .map(s => s.seatNumber);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080F', color: '#6B7280' }}>
            Loading event...
        </div>
    );

    if (bookingSuccess) return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#08080F' }}>
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute w-2 h-2 rounded-full"
                        style={{
                            background: i % 3 === 0 ? '#A855F7' : i % 3 === 1 ? '#EC4899' : '#7C3AED',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            opacity: Math.random() * 0.6 + 0.2,
                        }} />
                ))}
            </div>

            <div className="w-full max-w-lg fade-in">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-white text-center mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                    Booking Confirmed!
                </h2>
                <p className="text-center mb-8" style={{ color: '#6B7280' }}>
                    Your seats are locked in. See you at the show.
                </p>

                <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F1A', border: '1px solid rgba(168,85,247,0.3)' }}>
                    <div className="h-28 relative flex items-center px-6 overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=300&fit=crop&q=80"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0"
                            style={{ background: 'linear-gradient(135deg, rgba(76,29,149,0.85), rgba(131,24,67,0.85))' }} />
                        <div className="absolute inset-0 opacity-40"
                            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #A855F7, transparent 60%)' }} />
                        <div className="relative z-10">
                            <div className="text-xs font-bold tracking-widest mb-1" style={{ color: '#E9D5FF' }}>CONFIRMED</div>
                            <div className="text-white font-bold text-xl" style={{ fontFamily: 'Space Grotesk' }}>{event?.name}</div>
                        </div>
                    </div>

                    <div className="flex items-center px-6">
                        <div className="w-4 h-4 rounded-full -ml-8" style={{ background: '#08080F' }} />
                        <div className="flex-1 border-t-2 border-dashed mx-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                        <div className="w-4 h-4 rounded-full -mr-8" style={{ background: '#08080F' }} />
                    </div>

                    <div className="px-6 py-5 grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Date</div>
                            <div className="text-white text-sm font-medium">{event && formatDate(event.date)}</div>
                        </div>
                        <div>
                            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Time</div>
                            <div className="text-white text-sm font-medium">{event && formatDateTime(event.date)}</div>
                        </div>
                        <div>
                            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Venue</div>
                            <div className="text-white text-sm font-medium">{event?.venue}</div>
                        </div>
                        <div>
                            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>Booking Ref</div>
                            <div className="text-sm font-bold" style={{ color: '#A855F7' }}>{bookingRef}</div>
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>🎟️ Digital Entry Ticket</div>
                            <div className="text-white text-sm">Present this booking reference at the venue entrance.</div>
                        </div>
                    </div>
                </div>

                <button onClick={() => navigate('/')}
                    className="w-full mt-6 py-3 rounded-xl font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
                    Back to Events
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen" style={{ background: '#08080F' }}>

            <nav style={{ background: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(124,58,237,0.2)' }}
                className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                    <Logo size={30} />
                    <span className="font-bold text-lg text-white" style={{ fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>
                        SortMyScene
                    </span>
                </div>
                <button onClick={() => navigate('/')}
                    className="text-sm flex items-center gap-1 transition-all"
                    style={{ color: '#6B7280' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
                    ← Back to Events
                </button>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">

                <div className="flex-1">
                    {event && (
                        <div className="mb-8">
                            <span className="text-xs font-bold tracking-widest" style={{ color: '#A855F7' }}>LIVE EVENT</span>
                            <h2 className="text-3xl font-bold text-white mt-1 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                                {event.name}
                            </h2>
                            <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#6B7280' }}>
                                <span>📅 {formatDate(event.date)} at {formatDateTime(event.date)}</span>
                                <span>📍 {event.venue}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-5 mb-6">
                        {[
                            { color: '#22C55E', label: 'Available', border: true },
                            { color: '#7C3AED', label: 'Selected', glow: true },
                            { color: '#F59E0B', label: 'Reserved' },
                            { color: '#EF4444', label: 'Booked' },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-sm"
                                    style={{
                                        background: item.color,
                                        boxShadow: item.glow ? '0 0 8px rgba(124,58,237,0.8)' : 'none',
                                    }} />
                                <span className="text-sm" style={{ color: '#6B7280' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl p-6" style={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex justify-center mb-8">
                            <div className="px-16 py-2 rounded-lg text-xs font-bold tracking-widest"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))',
                                    border: '1px solid rgba(168,85,247,0.4)',
                                    color: '#A855F7'
                                }}>
                                ★ STAGE ★
                            </div>
                        </div>

                        <div className="space-y-3">
                            {ROWS.map((row, rowIndex) => (
                                <div key={row} className="flex items-center gap-3">
                                    <span className="text-xs font-bold w-4 text-center" style={{ color: '#6B7280' }}>{row}</span>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {getSeatsInRow(rowIndex).map(seat => (
                                            <button
                                                key={seat._id}
                                                onClick={() => handleSeatClick(seat)}
                                                className="w-9 h-9 rounded-lg text-xs font-semibold text-white transition-all duration-150"
                                                style={getSeatStyle(seat)}
                                                title={`${seat.seatNumber} — ${seat.status}`}>
                                                {seat.seatNumber.replace('S', '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
                            {error}
                        </div>
                    )}
                </div>

                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="sticky top-24 rounded-2xl p-6"
                        style={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.06)' }}>

                        <h3 className="font-bold text-white text-lg mb-5" style={{ fontFamily: 'Space Grotesk' }}>
                            Selection Summary
                        </h3>

                        {selectedSeats.length === 0 && !reservationId ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3">🪑</div>
                                <p className="text-sm" style={{ color: '#6B7280' }}>No seats selected yet.</p>
                                <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Click on green seats to pick your spots.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedSeatNumbers.length > 0 && (
                                    <div>
                                        <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#6B7280' }}>
                                            Selected Seats
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSeatNumbers.map(sn => (
                                                <span key={sn} className="text-xs px-2 py-1 rounded-lg font-medium"
                                                    style={{ background: 'rgba(124,58,237,0.2)', color: '#A855F7', border: '1px solid rgba(124,58,237,0.3)' }}>
                                                    {sn}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                                <div className="flex justify-between text-sm">
                                    <span style={{ color: '#6B7280' }}>Seats</span>
                                    <span className="text-white font-medium">{selectedSeats.length}</span>
                                </div>
                            </div>
                        )}

                        {reservationId && timeLeft !== null && timeLeft > 0 && (
                            <div className="mt-5 rounded-xl p-4"
                                style={{
                                    background: timeLeft < 60 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                    border: `1px solid ${timeLeft < 60 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                }}>
                                <div className="text-xs mb-1" style={{ color: timeLeft < 60 ? '#F87171' : '#FCD34D' }}>
                                    ⏱ Reservation expires in
                                </div>
                                <div className={`text-3xl font-bold ${timeLeft < 60 ? 'timer-urgent' : ''}`}
                                    style={{
                                        color: timeLeft < 60 ? '#EF4444' : '#F59E0B',
                                        fontFamily: 'Space Grotesk',
                                        letterSpacing: '0.05em'
                                    }}>
                                    {formatTime(timeLeft)}
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            {!reservationId ? (
                                <button onClick={handleReserve}
                                    disabled={selectedSeats.length === 0 || reserving}
                                    className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
                                    {reserving ? 'Reserving...' : `Reserve ${selectedSeats.length || ''} Seat${selectedSeats.length !== 1 ? 's' : ''}`}
                                </button>
                            ) : (
                                <button onClick={handleConfirmBooking}
                                    disabled={booking}
                                    className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                                    {booking ? 'Confirming...' : '✓ Confirm Booking'}
                                </button>
                            )}

                            <button onClick={handleCancel}
                                className="w-full mt-3 py-3 rounded-xl text-sm font-medium transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {reservationId ? 'Cancel Reservation' : 'Back to Events'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventPage;