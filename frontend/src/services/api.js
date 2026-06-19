import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// attach token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// auth
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);

// events
export const getEvents = () => API.get('/events');
export const getEventById = (id) => API.get(`/events/${id}`);

// reserve + book
export const reserveSeats = (data) => API.post('/reserve', data);
export const confirmBooking = (data) => API.post('/bookings', data);

export const cancelReservation = (reservationId) => API.delete(`/reserve/${reservationId}`);