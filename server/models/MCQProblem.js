const mongoose = require('mongoose');

const mcqSchema = new mongoose.Schema({
    day: { type: Number, required: true },
    title: { type: String, required: true },
    unlockDate: { type: Date, required: true },
    questions: [{
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctOptionIndex: { type: Number, required: true }, // 0-3
        explanation: { type: String }
    }]
}, { timestamps: true });

module.exports = mongoose.model('MCQProblem', mcqSchema);
