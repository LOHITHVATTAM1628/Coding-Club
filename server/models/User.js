const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    status: { type: String, enum: ['pending', 'active', 'blocked'], default: 'pending' },
    currentStreak: { type: Number, default: 0 }, // Used as Coding Streak now
    longestStreak: { type: Number, default: 0 },
    
    // Additional Modular Streaks
    mcqStreak: { type: Number, default: 0 },
    sqlStreak: { type: Number, default: 0 },
    masterStreak: { type: Number, default: 0 }, // Only increments if all 3 solved today
    longestMasterStreak: { type: Number, default: 0 },

    completedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
    completedMCQs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MCQProblem' }],
    completedSQLs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SQLProblem' }],
    
    points: { type: Number, default: 0 },
    
    lastSubmissionDate: { type: Date, default: null }, // Coding
    lastMCQDate: { type: Date, default: null },
    lastSQLDate: { type: Date, default: null },
    lastMasterStreakDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
