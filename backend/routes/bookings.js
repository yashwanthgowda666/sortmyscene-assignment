const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const auth = require('../middleware/auth');

// turns a temporary reservation into an actual booking.
// only works if the 10 min window hasnt run out yet
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

        // someone shouldnt be able to confirm a booking using a
        // reservationId that isnt theirs
        if (reservation.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // if the 10 min window already passed, this reservation is dead.
        // release the seats and don't let the booking go through
        if (reservation.expiresAt < new Date()) {
            await Seat.updateMany(
                { _id: { $in: reservation.seatNumbers } },
                { $set: { status: 'available' } }
            );

            await Reservation.findByIdAndDelete(reservationId);

            return res.status(410).json({ message: 'Reservation has expired, seats released' });
        }

        // still valid - go ahead and lock the seats in as booked
        await Seat.updateMany(
            { _id: { $in: reservation.seatNumbers } },
            { $set: { status: 'booked' } }
        );

        // reservation has done its job, no need to keep it around anymore
        await Reservation.findByIdAndDelete(reservationId);

        res.status(200).json({ message: 'Booking confirmed successfully' });

    } catch (err) {
        res.status(500).json({ message: 'something went wrong', error: err.message });
    }
});

module.exports = router;