const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    seatNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'reserved', 'booked'],
        default: 'available'
    }
}, { timestamps: true });

module.exports = mongoose.model('Seat', seatSchema);