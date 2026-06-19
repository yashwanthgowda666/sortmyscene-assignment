const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const auth = require('../middleware/auth');

// POST /api/bookings - Confirm booking
router.post('/', auth, async (req, res) => {
    try {
        const { reservationId } = req.body;

        if (!reservationId) {
            return res.status(400).json({ message: 'reservationId is required' });
        }

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // make sure this reservation belongs to the logged in user
        if (reservation.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // check if timer ran out
        if (reservation.expiresAt < new Date()) {
            // free up the seats again
            await Seat.updateMany(
                { _id: { $in: reservation.seatNumbers } },
                { $set: { status: 'available' } }
            );

            await Reservation.findByIdAndDelete(reservationId);

            return res.status(410).json({ message: 'Reservation has expired, seats released' });
        }

        // mark seats as booked
        await Seat.updateMany(
            { _id: { $in: reservation.seatNumbers } },
            { $set: { status: 'booked' } }
        );

        // clean up reservation
        await Reservation.findByIdAndDelete(reservationId);

        res.status(200).json({ message: 'Booking confirmed successfully' });

    } catch (error) {
        res.status(500).json({ message: 'something went wrong', error: error.message });
    }
});

module.exports = router;