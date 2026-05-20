const mongoose = require('mongoose');

const sqlSchema = new mongoose.Schema({
    day: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    unlockDate: { type: Date, required: true },
    initSQL: { type: String, required: true }, // The SQL to create tables and insert mock data
    expectedOutput: { type: String, required: true }, // JSON string of expected array of objects
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' }
}, { timestamps: true });

module.exports = mongoose.model('SQLProblem', sqlSchema);
