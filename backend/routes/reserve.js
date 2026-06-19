const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const auth = require('../middleware/auth');

// POST /api/reserve - Reserve seats
router.post('/', auth, async (req, res) => {
    try {
        const { eventId, seatIds } = req.body;

        if (!eventId || !seatIds || seatIds.length === 0) {
            return res.status(400).json({ message: 'eventId and seatIds are required' });
        }

        // atomically update each seat — only if still available
        // this is the core double booking prevention
        const updatePromises = seatIds.map(seatId =>
            Seat.findOneAndUpdate(
                { _id: seatId, status: 'available' },
                { $set: { status: 'reserved' } },
                { new: true }
            )
        );

        const updatedSeats = await Promise.all(updatePromises);

        // if any seat came back null, it was already taken
        const failedSeats = updatedSeats.filter(seat => seat === null);
        if (failedSeats.length > 0) {
            // roll back seats that did get reserved in this request
            const reservedInThisCall = updatedSeats
                .filter(seat => seat !== null)
                .map(seat => seat._id);

            await Seat.updateMany(
                { _id: { $in: reservedInThisCall } },
                { $set: { status: 'available' } }
            );

            return res.status(409).json({
                message: 'One or more seats are no longer available'
            });
        }

        // 10 min expiry
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const reservation = await Reservation.create({
            userId: req.user.userId,
            eventId,
            seatNumbers: seatIds,
            expiresAt
        });

        res.status(201).json({
            message: 'Seats reserved successfully',
            reservationId: reservation._id,
            expiresAt
        });

    } catch (error) {
        res.status(500).json({ message: 'something went wrong', error: error.message });
    }
});

// DELETE /api/reserve/:reservationId - Cancel an active reservation
router.delete('/:reservationId', auth, async (req, res) => {
    try {
        const { reservationId } = req.params;

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // only the user who made it can cancel it
        if (reservation.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // free up the seats
        await Seat.updateMany(
            { _id: { $in: reservation.seatNumbers } },
            { $set: { status: 'available' } }
        );

        await Reservation.findByIdAndDelete(reservationId);

        res.status(200).json({ message: 'Reservation cancelled, seats released' });

    } catch (error) {
        res.status(500).json({ message: 'something went wrong', error: error.message });
    }
});



module.exports = router;