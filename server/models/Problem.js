const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    day: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    description: { type: String, required: true },
    examples: [{
        input: String,
        output: String,
        explanation: String
    }],
    constraints: [String],
    starterCode: {
        java: { type: String, default: '' },
        python: { type: String, default: '' },
        cpp: { type: String, default: '' },
        javascript: { type: String, default: '' }
    },
    testCases: [{
        input: String,
        output: String,
        hidden: { type: Boolean, default: false }
    }],
    hiddenTestCases: [{
        input: String,
        output: String
    }],
    timeLimit: { type: Number, default: 2000 },
    memoryLimit: { type: Number, default: 256 },
    unlockDate: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Problem', problemSchema);
