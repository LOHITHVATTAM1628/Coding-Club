const mongoose = require('mongoose');

const mockResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true },
    
    totalScore: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    violationCount: { type: Number, default: 0 },
    isDisqualified: { type: Boolean, default: false },
    
    // Detailed performance
    sectionPerformance: {
        coding: { score: Number, total: Number, timeSpent: Number },
        mcq: { score: Number, total: Number, timeSpent: Number },
        sql: { score: Number, total: Number, timeSpent: Number }
    },
    
    // Store saved answers for review
    answers: {
        coding: mongoose.Schema.Types.Mixed, // { problemId: 'code' }
        mcq: mongoose.Schema.Types.Mixed, // { questionId: 'selectedOption' }
        sql: mongoose.Schema.Types.Mixed // { sqlId: 'query' }
    }
}, { timestamps: true });

module.exports = mongoose.model('MockResult', mockResultSchema);
