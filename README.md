SortMyScene — Event Ticket Booking Assignment

A simplified event ticket booking flow built with the MERN stack, focused on seat reservation, a 10-minute hold window, and booking confirmation.

Built as part of the hiring assignment for the Full Stack Developer (MERN + React Native) role at SortMyScene.


Tech Stack

Backend: Node.js, Express.js, MongoDB (Mongoose), JWT for auth
Frontend: React.js (Vite), React Router, Tailwind CSS, Axios


Project Structure

Sort-My-Scene/
├── backend/
│   ├── models/        # Event, Seat, Reservation, User
│   ├── routes/        # auth, events, reserve, bookings
│   ├── middleware/     # JWT auth middleware
│   ├── seed.js         # populates sample events, seats, users
│   └── server.js
└── frontend/
    ├── src/
    │   ├── pages/       # Login, Home, EventPage
    │   ├── components/  # Logo
    │   ├── context/     # AuthContext
    │   └── services/    # api.js — all axios calls


How to Run

Backend

bashcd backend
npm install

Create a .env file in backend/ (see .env.example):

PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_secret_string

Seed the database with sample events, seats, and test users:

bashnode seed.js

Start the server:

bashnode server.js

Server runs on http://localhost:5000.

Test accounts (created by the seed script):


yashwant@test.com / password123
rahul@test.com / password456


Frontend

bashcd frontend
npm install

Create a .env file in frontend/:

VITE_API_URL=http://localhost:5000/api

Start the dev server:

bashnpm run dev

Frontend runs on http://localhost:5173.


Design Decisions

Preventing double booking

The brief allows either atomic operations or multi-document transactions. I started with MongoDB transactions (session.startTransaction()), but MongoDB Atlas's free tier (M0) doesn't support multi-document transactions — they require a replica set, which isn't available on the shared free cluster.

I switched to atomic conditional updates using findOneAndUpdate:

javascriptSeat.findOneAndUpdate(
  { _id: seatId, status: 'available' }, // only matches if still available
  { $set: { status: 'reserved' } },
  { new: true }
)

MongoDB guarantees this find-and-update happens as a single indivisible operation at the document level. If two users try to reserve the same seat simultaneously, MongoDB processes the requests one at a time internally — the first request's filter matches and the seat is reserved; the second request's filter (status: 'available') no longer matches anything, so it returns null and the API responds with a 409 conflict. This gives the same correctness guarantee as a transaction, without needing a replica set.

Expired reservations

A reservation includes an expiresAt field, set 10 minutes from creation. Two things enforce this:


POST /api/bookings checks expiresAt before confirming — if expired, the seats are released back to available and the reservation is deleted, and the request returns a 410 (Gone).
GET /api/events/:id also lazily checks for any expired reservations on that event and releases their seats before returning seat data. This means seats self-heal back to available on the next read, even if the original user never returns to confirm or cancel — without needing a background cron job for a small-scale assignment like this.


Auth

Kept intentionally simple per the brief ("basic user authentication"): JWT-based register/login, with two seeded test accounts. No password reset, OAuth, or role-based access — out of scope for this assignment.

Frontend state

Reservation state (reservationId, expiresAt, selected seats) is persisted to localStorage, scoped by both event ID and the logged-in user's token. This solves two real issues found during testing:


Without persistence, navigating away from an event mid-reservation (e.g. back to the events list) and returning would lose the countdown timer client-side, even though the reservation was still valid server-side — leaving the user unable to confirm a booking that was technically still active.
Scoping the key by user token (not just event ID) prevents one browser session from displaying another logged-in user's active reservation if multiple accounts are used on the same browser.


Cancel reservation

Not explicitly required by the brief, but added a DELETE /api/reserve/:reservationId endpoint so users can release a held seat before the 10-minute timer expires, rather than being forced to wait it out. Ownership is checked server-side (only the user who created the reservation can cancel it).


Assumptions


Seat layout is generated generically (seats split evenly across 5 rows, labeled A–E) since the brief didn't specify a real venue layout.
Event images on the listing page are sourced from Unsplash for demo purposes; in production these would be uploaded/managed assets tied to each event.
No payment integration — booking confirmation is simulated; a real booking reference is generated client-side for the confirmation screen.
Business logic lives directly in route files rather than a separate controllers layer, given the small scope (4 core endpoints). In a larger codebase I'd split these out for testability and separation of concerns.



Live Demo


Frontend: (link added after deployment)
Backend: (link added after deployment)