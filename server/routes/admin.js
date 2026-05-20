const express = require('express');
const exceljs = require('exceljs');
const Problem = require('../models/Problem');
const MCQProblem = require('../models/MCQProblem');
const SQLProblem = require('../models/SQLProblem');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/admin/problems
// @desc    Create a new problem
router.post('/problems', protect, admin, async (req, res) => {
    try {
        const problemData = { ...req.body };
        // Ensure arrays are initialized if missing
        if (!problemData.testCases) problemData.testCases = [];
        if (!problemData.hiddenTestCases) problemData.hiddenTestCases = [];
        
        const problem = await Problem.create(problemData);
        res.status(201).json(problem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   PUT /api/admin/problems/:id
// @desc    Update a problem
router.put('/problems/:id', protect, admin, async (req, res) => {
    try {
        const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!problem) return res.status(404).json({ message: 'Problem not found' });
        res.json(problem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   DELETE /api/admin/problems/:id
// @desc    Delete a problem
router.delete('/problems/:id', protect, admin, async (req, res) => {
    try {
        const problem = await Problem.findByIdAndDelete(req.params.id);
        if (!problem) return res.status(404).json({ message: 'Problem not found' });
        res.json({ message: 'Problem removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/admin/analytics
// @desc    Get dashboard analytics
router.get('/analytics', protect, admin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'member' });
        const totalCoding = await Problem.countDocuments();
        const totalMCQs = await MCQProblem.countDocuments();
        const totalSQLs = await SQLProblem.countDocuments();
        const totalProblems = totalCoding + totalMCQs + totalSQLs;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Active users from coding
        const activeCodingUsers = await Submission.distinct('userId', {
            createdAt: { $gte: today }
        });
        
        // Active users from MCQ/SQL (users who submitted today)
        const activeOtherUsers = await User.find({
            $or: [
                { lastMCQDate: { $gte: today } },
                { lastSQLDate: { $gte: today } }
            ]
        }).select('_id');
        
        const activeSet = new Set([
            ...activeCodingUsers.map(id => id.toString()),
            ...activeOtherUsers.map(u => u._id.toString())
        ]);

        const leaderboard = await User.find({ role: 'member' })
            .select('name points currentStreak longestStreak')
            .sort({ points: -1 })
            .limit(5);

        // Daily submissions for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0,0,0,0);

        const recentSubmissions = await Submission.find({ createdAt: { $gte: sevenDaysAgo } });
        
        const chartMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            chartMap[dateStr] = { date: dateStr, solved: 0, failed: 0 };
        }

        recentSubmissions.forEach(sub => {
            const dateStr = sub.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (chartMap[dateStr]) {
                if (sub.status === 'solved') chartMap[dateStr].solved++;
                else chartMap[dateStr].failed++;
            }
        });

        const dailyChartData = Object.values(chartMap);

        res.json({
            totalUsers,
            totalProblems,
            totalCoding,
            totalMCQs,
            totalSQLs,
            activeToday: activeSet.size,
            leaderboard,
            dailyChartData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/admin/users
// @desc    Get all member users
router.get('/users', protect, admin, async (req, res) => {
    try {
        const query = { role: 'member' };
        if (req.query.status) {
            query.status = req.query.status;
        }
        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update a user's status
router.put('/users/:id/status', protect, admin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'active', 'blocked'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.status = status;
        await user.save();
        
        res.json({ message: 'User status updated', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/admin/export
// @desc    Download Excel Report
router.get('/export', protect, admin, async (req, res) => {
    try {
        const workbook = new exceljs.Workbook();
        
        // Sheet 1: Users Progress
        const usersSheet = workbook.addWorksheet('Users Progress');
        usersSheet.columns = [
            { header: 'User ID', key: '_id', width: 25 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Coding Status', key: 'codingStatus', width: 15 },
            { header: 'MCQ Status', key: 'mcqStatus', width: 15 },
            { header: 'SQL Status', key: 'sqlStatus', width: 15 },
            { header: 'Daily Pack Status', key: 'dailyPackStatus', width: 20 },
            { header: 'Master Streak', key: 'masterStreak', width: 15 },
            { header: 'Total Points', key: 'totalPoints', width: 15 }
        ];
        
        const users = await User.find({ role: 'member' });
        const today = new Date();
        today.setHours(0,0,0,0);
        
        users.forEach(u => {
            const codingStatus = u.lastSubmissionDate && new Date(u.lastSubmissionDate).setHours(0,0,0,0) === today.getTime() ? 'Solved' : 'Pending';
            const mcqStatus = u.lastMCQDate && new Date(u.lastMCQDate).setHours(0,0,0,0) === today.getTime() ? 'Solved' : 'Pending';
            const sqlStatus = u.lastSQLDate && new Date(u.lastSQLDate).setHours(0,0,0,0) === today.getTime() ? 'Solved' : 'Pending';
            const dailyPackStatus = (codingStatus === 'Solved' && mcqStatus === 'Solved' && sqlStatus === 'Solved') ? 'Completed' : 'Incomplete';
            
            usersSheet.addRow({
                _id: u._id.toString(),
                name: u.name,
                email: u.email,
                codingStatus,
                mcqStatus,
                sqlStatus,
                dailyPackStatus,
                masterStreak: u.masterStreak || 0,
                totalPoints: u.points || 0
            });
        });

        // Sheet 2: Problem Analytics
        const problemSheet = workbook.addWorksheet('Problem Analytics');
        problemSheet.columns = [
            { header: 'Problem ID', key: '_id', width: 25 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Unlock Date', key: 'unlockDate', width: 20 },
            { header: 'Total Attempts', key: 'totalAttempts', width: 15 },
            { header: 'Total Solved', key: 'totalSolved', width: 15 },
            { header: 'Success Rate (%)', key: 'successRate', width: 20 }
        ];

        const problems = await Problem.find({});
        for (const p of problems) {
            const attempts = await Submission.countDocuments({ problemId: p._id });
            const solves = await Submission.countDocuments({ problemId: p._id, status: 'solved' });
            const rate = attempts === 0 ? 0 : ((solves / attempts) * 100).toFixed(2);
            
            problemSheet.addRow({
                _id: p._id.toString(),
                title: p.title,
                unlockDate: p.unlockDate ? new Date(p.unlockDate).toLocaleDateString() : 'N/A',
                totalAttempts: attempts,
                totalSolved: solves,
                successRate: rate
            });
        }

        // Sheet 3: MCQ Analytics
        const mcqSheet = workbook.addWorksheet('MCQ Analytics');
        mcqSheet.columns = [
            { header: 'MCQ ID', key: '_id', width: 25 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Unlock Date', key: 'unlockDate', width: 20 },
            { header: 'Questions Count', key: 'qCount', width: 15 }
        ];

        const mcqs = await MCQProblem.find({});
        for (const m of mcqs) {
            mcqSheet.addRow({
                _id: m._id.toString(),
                title: m.title,
                unlockDate: m.unlockDate ? new Date(m.unlockDate).toLocaleDateString() : 'N/A',
                qCount: m.questions?.length || 0
            });
        }

        // Sheet 4: SQL Analytics
        const sqlSheet = workbook.addWorksheet('SQL Analytics');
        sqlSheet.columns = [
            { header: 'SQL ID', key: '_id', width: 25 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Difficulty', key: 'difficulty', width: 15 },
            { header: 'Unlock Date', key: 'unlockDate', width: 20 }
        ];

        const sqls = await SQLProblem.find({});
        for (const s of sqls) {
            sqlSheet.addRow({
                _id: s._id.toString(),
                title: s.title,
                difficulty: s.difficulty,
                unlockDate: s.unlockDate ? new Date(s.unlockDate).toLocaleDateString() : 'N/A'
            });
        }

        // Sheet 5: Daily Report (Aggregation of last 30 days submissions)
        const dailySheet = workbook.addWorksheet('Daily Report');
        dailySheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Active Users', key: 'activeUsers', width: 15 },
            { header: 'Solved Count', key: 'solvedCount', width: 15 },
            { header: 'Failed Count', key: 'failedCount', width: 15 }
        ];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const submissions = await Submission.find({ createdAt: { $gte: thirtyDaysAgo } });
        
        // Group by Date string
        const dailyData = {};
        submissions.forEach(sub => {
            const dateStr = sub.createdAt.toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { activeUsers: new Set(), solvedCount: 0, failedCount: 0 };
            }
            dailyData[dateStr].activeUsers.add(sub.userId.toString());
            if (sub.status === 'solved') dailyData[dateStr].solvedCount++;
            else dailyData[dateStr].failedCount++;
        });

        Object.keys(dailyData).sort((a,b) => b.localeCompare(a)).forEach(date => {
            const d = dailyData[date];
            dailySheet.addRow({
                date,
                activeUsers: d.activeUsers.size,
                solvedCount: d.solvedCount,
                failedCount: d.failedCount
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'codeforge_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
