const mongoose = require('mongoose');

const mockTestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g. "14:00"
    durationMinutes: { type: Number, required: true },
    graceTimeMinutes: { type: Number, default: 10 },
    maxViolations: { type: Number, default: 15 },
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
    
    sections: {
        coding: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
        mcq: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MCQ' }],
        sql: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SQL' }]
    },
    
    securitySettings: {
        webcamRequired: { type: Boolean, default: true },
        fullscreenRequired: { type: Boolean, default: true },
        copyPasteBlocked: { type: Boolean, default: true },
        tabSwitchDetection: { type: Boolean, default: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('MockTest', mockTestSchema);
