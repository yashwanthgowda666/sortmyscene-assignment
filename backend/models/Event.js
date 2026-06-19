const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    totalSeats: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);