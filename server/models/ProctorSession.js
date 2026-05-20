const mongoose = require('mongoose');

const proctorSessionSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examType: { type: String, default: 'MockExam' },
    examId: { type: String, default: 'mock-1' },
    deviceInfo: { type: Object },
    browserInfo: { type: Object },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    riskScore: { type: Number, default: 0 },
    violationCount: { type: Number, default: 0 },
    endedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ProctorSession', proctorSessionSchema);
