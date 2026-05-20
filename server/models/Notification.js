const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'alert', 'success'], default: 'info' },
    read: { type: Boolean, default: false },
    link: { type: String } // Optional link to redirect (e.g. to mock test or result)
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
