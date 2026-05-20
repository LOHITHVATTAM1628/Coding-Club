const express = require('express');
const router = express.Router();
const MockTest = require('../models/MockTest');
const MockResult = require('../models/MockResult');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all mock tests (Admin)
router.get('/admin', protect, admin, async (req, res) => {
    try {
        const tests = await MockTest.find().sort({ scheduledDate: -1, startTime: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create Mock Test (Admin)
router.post('/', protect, admin, async (req, res) => {
    try {
        const test = await MockTest.create(req.body);
        
        // Notify all members
        const users = await User.find({ role: 'member' });
        const notifications = users.map(u => ({
            userId: u._id,
            title: 'New Mock Test Scheduled',
            message: `A new mock test "${test.title}" has been scheduled for ${new Date(test.scheduledDate).toLocaleDateString()} at ${test.startTime}.`,
            type: 'info',
            link: '/dashboard'
        }));
        await Notification.insertMany(notifications);

        res.status(201).json(test);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get today's or next upcoming active mock test for a member
router.get('/today', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the next upcoming or currently active test (scheduledDate >= today)
        const test = await MockTest.findOne({
            scheduledDate: { $gte: today }
        }).sort({ scheduledDate: 1, startTime: 1 }) // Get the earliest upcoming test
        .populate('sections.coding')
        .populate('sections.mcq')
        .populate('sections.sql');

        if (!test) {
            return res.json(null);
        }

        // Check if user already submitted
        const result = await MockResult.findOne({ userId: req.user._id, mockTestId: test._id });
        
        res.json({ test, submitted: !!result, resultId: result?._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get specific mock test data for exam
router.get('/:id', protect, async (req, res) => {
    try {
        const test = await MockTest.findById(req.params.id)
            .populate('sections.coding')
            .populate('sections.mcq')
            .populate('sections.sql');
        
        if (!test) return res.status(404).json({ message: 'Mock test not found' });
        res.json(test);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit mock test
router.post('/:id/submit', protect, async (req, res) => {
    try {
        const { answers, timeSpentSeconds, violationCount, isDisqualified, sectionPerformance } = req.body;
        
        // Calculate score (mock basic calculation)
        let totalScore = 0;
        if (sectionPerformance) {
            totalScore = (sectionPerformance.coding?.score || 0) + 
                         (sectionPerformance.mcq?.score || 0) + 
                         (sectionPerformance.sql?.score || 0);
        }

        const result = await MockResult.create({
            userId: req.user._id,
            mockTestId: req.params.id,
            totalScore,
            timeSpentSeconds,
            violationCount,
            isDisqualified,
            sectionPerformance,
            answers
        });

        // Notify user of completion
        await Notification.create({
            userId: req.user._id,
            title: 'Mock Test Submitted',
            message: `Your exam has been submitted. You scored ${totalScore} points.`,
            type: 'success',
            link: `/mock-results/${result._id}`
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get specific result
router.get('/results/:id', protect, async (req, res) => {
    try {
        const result = await MockResult.findById(req.params.id)
            .populate('mockTestId')
            .populate('userId', 'name email');
        if (!result) return res.status(404).json({ message: 'Result not found' });
        
        // Ensure user owns result or is admin
        if (result.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user notifications
router.get('/notifications/me', protect, async (req, res) => {
    try {
        const notifs = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
        res.json(notifs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
