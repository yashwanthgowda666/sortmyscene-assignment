const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const auth = require('../middleware/auth');

// reserve seats for 10 mins. this is the trickiest part of the whole assignment -
// need to make sure two people cant grab the same seat at the same time
router.post('/', auth, async (req, res) => {
    try {
        const { eventId, seatIds } = req.body;

        if (!eventId || !seatIds || seatIds.length === 0) {
            return res.status(400).json({ message: 'eventId and seatIds are required' });
        }

        // tried using mongoose transactions here first but atlas free tier
        // doesnt support them (needs a replica set). findOneAndUpdate with a
        // status check in the filter does the same job - mongo treats the
        // find + update as one atomic step so theres no race condition
        const updateJobs = seatIds.map(seatId =>
            Seat.findOneAndUpdate(
                { _id: seatId, status: 'available' },
                { $set: { status: 'reserved' } },
                { new: true }
            )
        );

        const updatedSeats = await Promise.all(updateJobs);

        // null means someone else already took that seat before us
        const seatsThatFailed = updatedSeats.filter(s => s === null);

        if (seatsThatFailed.length > 0) {
            // some seats in this batch DID succeed though, so we need to undo those
            // otherwise we'd end up partially reserving someone's selection
            const idsToRollback = updatedSeats
                .filter(s => s !== null)
                .map(s => s._id);

            await Seat.updateMany(
                { _id: { $in: idsToRollback } },
                { $set: { status: 'available' } }
            );

            return res.status(409).json({ message: 'One or more seats are no longer available' });
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min hold

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

    } catch (err) {
        res.status(500).json({ message: 'something went wrong', error: err.message });
    }
});

// lets a user free up their own reservation early instead of waiting
// out the full 10 min timer. wasn't in the original brief but felt
// like a basic thing a real user would expect
router.delete('/:reservationId', auth, async (req, res) => {
    try {
        const { reservationId } = req.params;
        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // cant let user A cancel user B's reservation just by guessing the id
        if (reservation.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await Seat.updateMany(
            { _id: { $in: reservation.seatNumbers } },
            { $set: { status: 'available' } }
        );

        await Reservation.findByIdAndDelete(reservationId);

        res.status(200).json({ message: 'Reservation cancelled, seats released' });

    } catch (err) {
        res.status(500).json({ message: 'something went wrong', error: err.message });
    }
});

module.exports = router;