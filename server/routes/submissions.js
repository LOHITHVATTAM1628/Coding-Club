const express = require('express');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/User');
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');
const { updateMasterStreak } = require('../utils/masterStreak');

const router = express.Router();

// @route   POST /api/submissions/run
// @desc    Run code against visible test cases only (No DB save)
router.post('/run', protect, async (req, res) => {
    try {
        const { problemId, code, language } = req.body;
        
        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ message: 'Problem not found' });

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayProblem = await Problem.findOne({ unlockDate: { $lte: today } }).sort({ day: -1 });
        if (!todayProblem || todayProblem._id.toString() !== problem._id.toString()) {
            return res.status(403).json({ message: 'Submissions are closed for past problems. This problem is now Read-Only.' });
        }

        const visibleTestCases = problem.testCases || [];
        if (visibleTestCases.length === 0) {
             return res.status(400).json({ message: 'No visible test cases available.' });
        }

        const languageMap = { 
            javascript: 'nodejs-20.17.0', 
            python: 'cpython-3.14.0', 
            java: 'openjdk-jdk-22+36', 
            cpp: 'gcc-head' 
        };
        const compilerName = languageMap[language] || language;
        
        let processedCode = code;
        if (language === 'java') {
            processedCode = processedCode.replace(/public\s+class\s+Main/g, 'class Main');
        }
        
        const results = [];

        for (let i = 0; i < visibleTestCases.length; i++) {
            const tc = visibleTestCases[i];
            
            try {
                const response = await axios.post('https://wandbox.org/api/compile.json', {
                    compiler: compilerName,
                    code: processedCode,
                    stdin: tc.input || '',
                    save: false
                });

                const run = response.data;
                const actualOutput = run.program_output ? run.program_output.trim() : '';
                const expectedOutput = tc.output ? tc.output.trim() : '';
                
                if (run.status !== '0' || run.compiler_error || run.program_error) {
                    results.push({ passed: false, error: run.compiler_error || run.program_error || 'Execution failed' });
                } else if (actualOutput !== expectedOutput) {
                    results.push({ passed: false, expected: expectedOutput, actual: actualOutput });
                } else {
                    results.push({ passed: true });
                }
            } catch (err) {
                results.push({ passed: false, error: 'Engine Error: ' + err.message });
            }
        }

        res.json({ results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/submissions
// @desc    Submit code for a problem (Evaluates all tests & saves to DB)
router.post('/', protect, async (req, res) => {
    try {
        const { problemId, code, language } = req.body;
        
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayProblem = await Problem.findOne({ unlockDate: { $lte: today } }).sort({ day: -1 });
        if (!todayProblem || todayProblem._id.toString() !== problem._id.toString()) {
            return res.status(403).json({ message: 'Submissions are closed for past problems. This problem is now Read-Only.' });
        }

        const allTestCases = [...(problem.testCases || []), ...(problem.hiddenTestCases || [])];
        if (allTestCases.length === 0) {
             return res.status(400).json({ message: 'Problem has no test cases configured for evaluation.' });
        }

        let status = 'solved';
        let failedAt = null;

        // Map languages to piston names
        const languageMap = { 
            javascript: 'nodejs-20.17.0', 
            python: 'cpython-3.14.0', 
            java: 'openjdk-jdk-22+36', 
            cpp: 'gcc-head' 
        };
        const compilerName = languageMap[language] || language;

        let processedCode = code;
        if (language === 'java') {
            processedCode = processedCode.replace(/public\s+class\s+Main/g, 'class Main');
        }

        for (let i = 0; i < allTestCases.length; i++) {
            const tc = allTestCases[i];
            
            try {
                const response = await axios.post('https://wandbox.org/api/compile.json', {
                    compiler: compilerName,
                    code: processedCode,
                    stdin: tc.input || '',
                    save: false
                });

                const result = response.data;
                
                if (result.status !== '0' || result.compiler_error || result.program_error) {
                    status = 'failed';
                    failedAt = `Error on Test Case ${i + 1}:\n${result.compiler_error || result.program_error}`;
                    break;
                }

                const actualOutput = result.program_output ? result.program_output.trim() : '';
                const expectedOutput = tc.output ? tc.output.trim() : '';

                if (actualOutput !== expectedOutput) {
                    status = 'failed';
                    failedAt = `Failed Test Case ${i + 1}.\nExpected: ${expectedOutput}\nGot: ${actualOutput}`;
                    break;
                }
            } catch (err) {
                status = 'failed';
                failedAt = 'Evaluation Engine Error: ' + err.message;
                break;
            }
        }

        const submission = await Submission.create({
            userId: req.user._id,
            problemId,
            code,
            status,
            language,
            details: failedAt
        });

        let streakUpdated = false;

        if (status === 'solved') {
            const user = await User.findById(req.user._id);
            
            if (!user.completedProblems.includes(problemId)) {
                user.completedProblems.push(problemId);
                
                let pointsEarned = 10;
                if (problem.difficulty === 'medium') pointsEarned = 20;
                if (problem.difficulty === 'hard') pointsEarned = 30;
                user.points += pointsEarned;

                const currentDate = new Date();
                currentDate.setHours(0,0,0,0); // midnight today
                
                let lastSub = user.lastSubmissionDate;
                if (lastSub) {
                    lastSub.setHours(0,0,0,0);
                    const diffTime = currentDate.getTime() - lastSub.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays === 1) {
                        user.currentStreak += 1;
                        streakUpdated = true;
                    } else if (diffDays > 1) {
                        user.currentStreak = 1;
                        streakUpdated = true;
                    }
                } else {
                    user.currentStreak = 1;
                    streakUpdated = true;
                }
                
                if (user.currentStreak > user.longestStreak) {
                    user.longestStreak = user.currentStreak;
                }
                
                
                // Only update lastSubmissionDate if we actually updated the streak or it's empty
                if (!lastSub || lastSub.getTime() !== currentDate.getTime()) {
                    user.lastSubmissionDate = new Date();
                }
                
                await user.save();
            }
        }

        if (status === 'solved') {
            const freshUser = await User.findById(req.user._id);
            const today = new Date();
            today.setHours(0,0,0,0);
            const masterStats = await updateMasterStreak(freshUser, today);

            res.status(201).json({
                ...submission._doc,
                isAccepted: true,
                streakUpdated,
                currentStreak: freshUser.currentStreak,
                masterStreakUpdated: masterStats.streakUpdated,
                currentMasterStreak: masterStats.currentStreak
            });
        } else {
            res.status(201).json(submission);
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/submissions/me
// @desc    Get user's submissions
router.get('/me', protect, async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('problemId', 'title difficulty day');
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
