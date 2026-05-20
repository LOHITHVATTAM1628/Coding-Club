const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
    user: { type: String, required: true },
    event: { type: String, required: true },
    module: { type: String, default: 'Mock Exam' },
    timestamp: { type: Date, default: Date.now },
    risk: { type: String, default: 'low' }
});

module.exports = mongoose.model('EventLog', eventLogSchema);
