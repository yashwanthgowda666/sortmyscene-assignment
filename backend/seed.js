const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const Reservation = require('./models/Reservation');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        // Clear existing data
        await User.deleteMany();
        await Event.deleteMany();
        await Seat.deleteMany();
        await Reservation.deleteMany();
        console.log('Cleared existing data');

        // Create users
        const hashedPassword1 = await bcrypt.hash('password123', 10);
        const hashedPassword2 = await bcrypt.hash('password456', 10);

        const users = await User.insertMany([
            {
                name: 'Yashwant',
                email: 'yashwant@test.com',
                password: hashedPassword1
            },
            {
                name: 'Rahul',
                email: 'rahul@test.com',
                password: hashedPassword2
            }
        ]);
        console.log('Users seeded');

        // Create events
        const events = await Event.insertMany([
            {
                name: 'Sunburn Festival Mumbai',
                date: new Date('2025-12-15T18:00:00'),
                venue: 'MMRDA Grounds, BKC, Mumbai',
                totalSeats: 20
            },
            {
                name: 'Nucleya Live Night',
                date: new Date('2025-11-20T21:00:00'),
                venue: 'Antiсocial, Bandra, Mumbai',
                totalSeats: 15
            },
            {
                name: 'Bacardi NH7 Weekender',
                date: new Date('2025-12-28T17:00:00'),
                venue: 'Mahalaxmi Racecourse, Mumbai',
                totalSeats: 25
            }
        ]);
        console.log('Events seeded');

        // Create seats for each event
        const seatPromises = events.map(event => {
            const seats = [];
            for (let i = 1; i <= event.totalSeats; i++) {
                seats.push({
                    eventId: event._id,
                    seatNumber: `S${i}`,
                    status: 'available'
                });
            }
            return Seat.insertMany(seats);
        });

        await Promise.all(seatPromises);
        console.log('Seats seeded');

        console.log('----------------------------');
        console.log('Seed complete. Test accounts:');
        console.log('Email: yashwant@test.com | Password: password123');
        console.log('Email: rahul@test.com | Password: password456');
        console.log('----------------------------');

        mongoose.connection.close();

    } catch (error) {
        console.error('Seed error:', error);
        mongoose.connection.close();
    }
};

seedDB();