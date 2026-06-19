const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');

// releases seats from any reservation that has expired
// this runs as a self-healing check whenever events/seats are fetched
const releaseExpiredReservations = async (eventId) => {
    const expiredReservations = await Reservation.find({
        eventId,
        expiresAt: { $lt: new Date() },
    });

    if (expiredReservations.length === 0) return;

    for (const reservation of expiredReservations) {
        await Seat.updateMany(
            { _id: { $in: reservation.seatNumbers } },
            { $set: { status: 'available' } }
        );
        await Reservation.findByIdAndDelete(reservation._id);
    }
};

// GET /api/events - Get all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'something went wrong', error: error.message });
    }
});

// GET /api/events/:id - Get single event with seats
router.get('/:id', async (req, res) => {
    try {
        // clean up any expired reservations for this event first
        await releaseExpiredReservations(req.params.id);

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const seats = await Seat.find({ eventId: req.params.id });

        res.status(200).json({ event, seats });
    } catch (error) {
        res.status(500).json({ message: 'something went wrong', error: error.message });
    }
});

module.exports = router;