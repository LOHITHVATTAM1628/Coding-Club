const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Coding', 'MCQ', 'SQL', 'Interview Prep', 'System Design', 'Aptitude', 'Roadmap'],
        required: true
    },
    company: {
        type: String,
        default: ''
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard', ''],
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
