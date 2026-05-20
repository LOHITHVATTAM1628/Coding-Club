const express = require('express');
const router = express.Router();
const MCQProblem = require('../models/MCQProblem');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const { updateMasterStreak } = require('../utils/masterStreak');

// @route   GET /api/mcqs/today
// @desc    Get the daily MCQ pack (without correctOptionIndex to prevent cheating)
router.get('/today', protect, async (req, res) => {
    try {
        const now = new Date();
        
        // Use end of day for the $lte query so we don't miss today's challenge due to UTC offsets
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        
        const mcq = await MCQProblem.findOne({ unlockDate: { $lte: endOfToday } }).sort({ day: -1 });
        if (!mcq) return res.status(404).json({ message: 'No MCQ challenge available for today' });
        
        const isToday = true;

        // Strip out the correct answers from the payload
        const sanitizedQuestions = mcq.questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options
        }));

        res.json({
            _id: mcq._id,
            day: mcq.day,
            title: mcq.title,
            unlockDate: mcq.unlockDate,
            questions: sanitizedQuestions,
            isToday
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching MCQ' });
    }
});

// @route   POST /api/mcqs/submit
// @desc    Submit MCQ answers and evaluate
router.post('/submit', protect, async (req, res) => {
    try {
        const { mcqId, answers } = req.body; // answers is an array of indices
        
        const mcq = await MCQProblem.findById(mcqId);
        if (!mcq) return res.status(404).json({ message: 'MCQ not found' });
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const mcqDate = new Date(mcq.unlockDate);
        mcqDate.setHours(0,0,0,0);
        
        if (mcqDate.getTime() !== today.getTime()) {
            return res.status(400).json({ message: 'Can only submit today\'s challenge.' });
        }

        const user = await User.findById(req.user._id);
        
        // Prevent resubmission
        if (user.completedMCQs.includes(mcqId)) {
            return res.status(400).json({ message: 'Already completed this MCQ challenge.' });
        }

        let score = 0;
        const results = [];
        
        mcq.questions.forEach((q, index) => {
            const isCorrect = answers[index] === q.correctOptionIndex;
            if (isCorrect) score++;
            results.push({
                questionText: q.questionText,
                selectedOption: answers[index],
                correctOption: q.correctOptionIndex,
                explanation: q.explanation,
                isCorrect
            });
        });

        // Award points and update streak
        user.points += 20;
        user.completedMCQs.push(mcqId);
        
        let streakUpdated = false;
        
        if (user.lastMCQDate) {
            const lastDate = new Date(user.lastMCQDate);
            lastDate.setHours(0,0,0,0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastDate.getTime() === yesterday.getTime()) {
                user.mcqStreak += 1;
            } else if (lastDate.getTime() < yesterday.getTime()) {
                user.mcqStreak = 1;
            }
        } else {
            user.mcqStreak = 1;
        }
        
        user.lastMCQDate = today;
        streakUpdated = true;

        await user.save();
        
        const masterStats = await updateMasterStreak(user, today);

        res.json({
            message: 'MCQ Completed',
            score,
            total: mcq.questions.length,
            results,
            streakUpdated,
            currentStreak: user.mcqStreak,
            masterStreakUpdated: masterStats.streakUpdated,
            currentMasterStreak: masterStats.currentStreak
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error submitting MCQ' });
    }
});

// Admin routes
router.get('/', protect, admin, async (req, res) => {
    try {
        const mcqs = await MCQProblem.find().sort({ day: -1 });
        res.json(mcqs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', protect, admin, async (req, res) => {
    try {
        const mcq = await MCQProblem.create(req.body);
        res.status(201).json(mcq);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/:id', protect, admin, async (req, res) => {
    try {
        const mcq = await MCQProblem.findById(req.params.id);
        if (!mcq) return res.status(404).json({ message: 'MCQ not found' });
        res.json(mcq);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', protect, admin, async (req, res) => {
    try {
        const mcq = await MCQProblem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!mcq) return res.status(404).json({ message: 'MCQ not found' });
        res.json(mcq);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const mcq = await MCQProblem.findByIdAndDelete(req.params.id);
        if (!mcq) return res.status(404).json({ message: 'MCQ not found' });
        res.json({ message: 'MCQ removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
