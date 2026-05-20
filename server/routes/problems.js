const express = require('express');
const Problem = require('../models/Problem');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/problems/today
// @desc    Get today's unlocked problem
router.get('/today', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const problem = await Problem.findOne({ 
            unlockDate: { $lte: today } 
        }).sort({ day: -1 });

        if (!problem) {
            return res.status(404).json({ message: 'No problem available for today' });
        }
        
        const problemData = problem.toObject();
        delete problemData.hiddenTestCases;
        if (problemData.testCases) {
            problemData.testCases = problemData.testCases.filter(tc => !tc.hidden);
        }
        
        res.json(problemData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/problems
// @desc    Get all unlocked problems
router.get('/', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const problems = await Problem.find({ unlockDate: { $lte: today } })
            .select('-hiddenTestCases')
            .sort({ day: -1 });
        
        // Also filter out hidden from testCases array for the list
        const problemsData = problems.map(p => {
            const pd = p.toObject();
            if (pd.testCases) pd.testCases = pd.testCases.filter(tc => !tc.hidden);
            return pd;
        });
        
        res.json(problemsData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/problems/:id
// @desc    Get problem by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const problem = await Problem.findById(req.params.id);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        
        // Ensure the problem is unlocked
        if (new Date(problem.unlockDate) > new Date()) {
            return res.status(403).json({ message: 'Problem is locked' });
        }

        const problemData = problem.toObject();
        delete problemData.hiddenTestCases;
        if (problemData.testCases) {
            problemData.testCases = problemData.testCases.filter(tc => !tc.hidden);
        }
        
        // Determine if this is Today's Problem
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayProblem = await Problem.findOne({ 
            unlockDate: { $lte: today } 
        }).sort({ day: -1 });

        problemData.isToday = todayProblem && todayProblem._id.toString() === problem._id.toString();
        
        res.json(problemData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
