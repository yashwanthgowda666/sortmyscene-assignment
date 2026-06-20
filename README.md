# 🎟️ SortMyScene — Event Ticket Booking Assignment

A simplified event ticket booking flow built with the MERN stack, focused on seat reservation, a 10-minute hold window, and booking confirmation.

Built as part of the hiring assignment for the **Full Stack Developer (MERN + React Native)** role at SortMyScene.

🔗 **Live Demo:** [sortmyscene-live.vercel.app](https://sortmyscene-live.vercel.app/login)
🔗 **Backend API:** [sortmyscene-assignment-cbde.onrender.com](https://sortmyscene-assignment-cbde.onrender.com)

> ⚠️ The backend is hosted on Render's free tier, which spins down after inactivity. The first request after idle time may take 20–30 seconds to respond while it wakes up.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), React Router, Tailwind CSS, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## 📁 Project Structure

```
Sort-My-Scene/
├── backend/
│   ├── models/         # Event, Seat, Reservation, User
│   ├── routes/         # auth, events, reserve, bookings
│   ├── middleware/      # JWT auth middleware
│   ├── seed.js          # populates sample events, seats, users
│   └── server.js
└── frontend/
    ├── src/
    │   ├── pages/        # Login, Home, EventPage
    │   ├── components/   # Logo
    │   ├── context/      # AuthContext
    │   └── services/     # api.js — all axios calls
    └── vercel.json        # SPA routing config
```

---

## ⚙️ How to Run Locally

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (see `.env.example`):

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_secret_string
```

Seed the database with sample events, seats, and test users:

```bash
node seed.js
```

Start the server:

```bash
node server.js
```

Server runs on `http://localhost:5000`.

**🔑 Test accounts (created by the seed script):**
| Email | Password |
|---|---|
| `yashwant@test.com` | `password123` |
| `rahul@test.com` | `password456` |

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## 🔄 Core Flow

1. **Login / Register** → receive JWT
2. **Browse events** → `GET /api/events`
3. **Select an event** → seat grid loads with live status (`available` / `reserved` / `booked`)
4. **Select seats** → click **Reserve** → `POST /api/reserve` → 10-minute countdown starts
5. **Confirm Booking** → `POST /api/bookings` → success screen with booking reference
6. **Cancel anytime** during the hold window → `DELETE /api/reserve/:id` → seats released immediately

---

## 🧠 Design Decisions

### 1. Preventing double booking

The brief allows either atomic operations or multi-document transactions. I started with MongoDB transactions (`session.startTransaction()`), but **MongoDB Atlas's free tier (M0) doesn't support multi-document transactions** — they require a replica set, unavailable on the shared free cluster.

I switched to **atomic conditional updates** using `findOneAndUpdate`:

```javascript
Seat.findOneAndUpdate(
  { _id: seatId, status: 'available' }, // only matches if still available
  { $set: { status: 'reserved' } },
  { new: true }
)
```

MongoDB guarantees this find-and-update happens as a single indivisible operation at the document level. If two users try to reserve the same seat simultaneously, MongoDB processes the requests one at a time internally — the first request's filter matches and the seat is reserved; the second request's filter no longer matches anything, so it returns `null` and the API responds with a `409 Conflict`. This gives the same correctness guarantee as a transaction, without needing a replica set.

### 2. Expired reservations

Each reservation has an `expiresAt` field, set 10 minutes from creation. Two mechanisms enforce this:

- `POST /api/bookings` checks `expiresAt` before confirming. If expired, seats are released back to `available`, the reservation is deleted, and the request returns `410 Gone`.
- `GET /api/events/:id` **lazily cleans up** any expired reservations for that event before returning seat data. Seats self-heal back to `available` on the next read — even if the original user never returns to confirm or cancel — without needing a background cron job for a small-scale assignment like this.

### 3. Frontend reservation persistence

Reservation state (`reservationId`, `expiresAt`, selected seats) is persisted to `localStorage`, **scoped by both event ID and the logged-in user's auth token**. This solves two real issues found during testing:

- Without persistence, navigating away from an event mid-reservation and returning would lose the countdown timer client-side, even though the reservation was still valid server-side — leaving the user unable to confirm a booking that was technically still active.
- Scoping the key by token (not just event ID) prevents one browser session from displaying another logged-in user's active reservation, if multiple accounts are used on the same browser.

### 4. Cancel reservation

Not explicitly required by the brief, but I added `DELETE /api/reserve/:reservationId` so users can release a held seat before the 10-minute timer expires, instead of being forced to wait it out. Ownership is verified server-side — only the user who created the reservation can cancel it.

### 5. Auth

Kept intentionally simple per the brief ("basic user authentication"): JWT-based register/login with two seeded test accounts. No password reset, OAuth, or role-based access — out of scope for this assignment.

---

## ⚖️ Known Tradeoffs & Limitations

Being upfront about what this version doesn't cover, and why:

| Limitation | Why | Production fix |
|---|---|---|
| **No real-time sync across sessions** | Two users viewing the same event won't see each other's reserve/cancel actions until they refresh or attempt an action themselves (which will correctly fail if the seat was just taken). The brief asks for error handling *on action*, not live multi-client sync — a meaningfully larger feature. | Add WebSockets (Socket.io) to push live seat updates to all connected clients viewing the same event. |
| **Atomic updates instead of transactions** | MongoDB Atlas free tier doesn't support multi-document transactions. | Use a paid tier with a replica set, or keep atomic updates — they're correct and used in production at this scale regardless. |
| **No background expiry job** | Expired reservations are cleaned up lazily on read, not via a cron job. Avoids running scheduled infrastructure for a small assignment. | Add a scheduled job (e.g. `node-cron` or a queue) for guaranteed cleanup even with zero traffic. |
| **Generic seat layout** | Seats are split evenly across 5 fixed rows (A–E) since no real venue layout was specified. | Model actual venue sections/rows per event. |
| **No payment integration** | Booking confirmation is simulated; a booking reference is generated client-side. | Integrate Razorpay/Stripe before confirming. |
| **Business logic in route files** | Given the small scope (4 core endpoints), I didn't add a separate controllers layer. | Split into controllers for testability as the codebase grows. |
| **Render free tier cold starts** | The live backend demo may take 20–30s to respond after inactivity. | Use a paid tier or a keep-alive ping for production. |

---

## 📝 Assumptions

- Event images on the listing/confirmation pages are sourced from Unsplash for demo purposes; in production these would be uploaded/managed assets tied to each event.
- Seat layout (5 rows, A–E) is generic since the brief didn't specify a real venue map.
- `JWT_SECRET` and `MONGO_URI` are provided via environment variables and never committed (`.env.example` included as a template).

---

## 🚀 Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Root directory: `frontend`, includes `vercel.json` for SPA routing |
| Backend | Render | Root directory: `backend`, free tier |
| Database | MongoDB Atlas | Free tier (M0) |
