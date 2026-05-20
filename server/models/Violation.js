const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProctorSession', required: true },
    type: { type: String, required: true },
    description: { type: String },
    snapshotBase64: { type: String },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
}, { timestamps: true });

module.exports = mongoose.model('Violation', violationSchema);
