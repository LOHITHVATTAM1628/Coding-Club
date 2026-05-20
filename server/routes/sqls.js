const express = require('express');
const router = express.Router();
const SQLProblem = require('../models/SQLProblem');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const sqlite3 = require('sqlite3').verbose();
const { updateMasterStreak } = require('../utils/masterStreak');

const runQuery = async (db, sql) => {
    // Split by semicolon, filter out empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    if (statements.length === 0) return [];
    
    let lastResult = [];
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (i === statements.length - 1) {
            // Last statement: use db.all to fetch results
            lastResult = await new Promise((resolve, reject) => {
                db.all(stmt, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } else {
            // Intermediate statements: use db.run to execute without returning rows
            await new Promise((resolve, reject) => {
                db.run(stmt, [], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }
    return lastResult;
};

const executeSQLScript = (db, script) => {
    return new Promise((resolve, reject) => {
        db.exec(script, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// @route   GET /api/sql/today
// @desc    Get the daily SQL challenge (without expected output to prevent cheating)
router.get('/today', protect, async (req, res) => {
    try {
        const now = new Date();
        
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        
        const sql = await SQLProblem.findOne({ unlockDate: { $lte: endOfToday } }).sort({ day: -1 });
        if (!sql) return res.status(404).json({ message: 'No SQL challenge available for today' });
        
        const isToday = true;

        res.json({
            _id: sql._id,
            day: sql.day,
            title: sql.title,
            description: sql.description,
            initSQL: sql.initSQL,
            unlockDate: sql.unlockDate,
            difficulty: sql.difficulty,
            isToday
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching SQL challenge' });
    }
});

// @route   POST /api/sql/run
// @desc    Run SQL query (test)
router.post('/run', protect, async (req, res) => {
    const db = new sqlite3.Database(':memory:');
    try {
        const { sqlId, query } = req.body;
        const problem = await SQLProblem.findById(sqlId);
        
        if (!problem) throw new Error('Problem not found');
        
        // Initialize schema
        await executeSQLScript(db, problem.initSQL);
        
        // Run user query
        const userOutput = await runQuery(db, query);
        
        res.json({ success: true, result: userOutput });
    } catch (error) {
        res.json({ success: false, message: error.message });
    } finally {
        db.close();
    }
});

// @route   POST /api/sql/submit
// @desc    Submit SQL and evaluate against expected Output
router.post('/submit', protect, async (req, res) => {
    const db = new sqlite3.Database(':memory:');
    try {
        const { sqlId, query } = req.body;
        const problem = await SQLProblem.findById(sqlId);
        if (!problem) throw new Error('Problem not found');
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const probDate = new Date(problem.unlockDate);
        probDate.setHours(0,0,0,0);
        
        if (probDate.getTime() !== today.getTime()) {
            return res.status(400).json({ message: 'Can only submit today\'s challenge.' });
        }

        const user = await User.findById(req.user._id);
        if (user.completedSQLs.includes(sqlId)) {
            return res.status(400).json({ message: 'Already completed this SQL challenge.' });
        }

        // Run validation
        await executeSQLScript(db, problem.initSQL);
        const userOutput = await runQuery(db, query);
        
        // Very basic validation (stringify and compare)
        // Note: For production, a more robust deep equal that ignores column order/case is recommended.
        const expectedJSON = JSON.parse(problem.expectedOutput);
        
        if (JSON.stringify(userOutput) === JSON.stringify(expectedJSON)) {
            // Success
            user.points += 30;
            user.completedSQLs.push(sqlId);
            
            let streakUpdated = false;
            if (user.lastSQLDate) {
                const lastDate = new Date(user.lastSQLDate);
                lastDate.setHours(0,0,0,0);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastDate.getTime() === yesterday.getTime()) {
                    user.sqlStreak += 1;
                } else if (lastDate.getTime() < yesterday.getTime()) {
                    user.sqlStreak = 1;
                }
            } else {
                user.sqlStreak = 1;
            }
            
            user.lastSQLDate = today;
            streakUpdated = true;
            await user.save();
            
            const masterStats = await updateMasterStreak(user, today);

            res.json({
                isAccepted: true,
                message: 'SQL Challenge Completed',
                streakUpdated,
                currentStreak: user.sqlStreak,
                masterStreakUpdated: masterStats.streakUpdated,
                currentMasterStreak: masterStats.currentStreak,
                result: userOutput
            });
        } else {
            res.json({
                isAccepted: false,
                message: 'Query output does not match expected output.',
                actual: userOutput,
                expected: expectedJSON
            });
        }
    } catch (error) {
        res.status(500).json({ isAccepted: false, message: error.message });
    } finally {
        db.close();
    }
});

// Admin routes
router.get('/', protect, admin, async (req, res) => {
    try {
        const sqls = await SQLProblem.find().sort({ day: -1 });
        res.json(sqls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', protect, admin, async (req, res) => {
    try {
        const sql = await SQLProblem.create(req.body);
        res.status(201).json(sql);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/:id', protect, admin, async (req, res) => {
    try {
        const sql = await SQLProblem.findById(req.params.id);
        if (!sql) return res.status(404).json({ message: 'SQL lab not found' });
        res.json(sql);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', protect, admin, async (req, res) => {
    try {
        const sql = await SQLProblem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!sql) return res.status(404).json({ message: 'SQL lab not found' });
        res.json(sql);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const sql = await SQLProblem.findByIdAndDelete(req.params.id);
        if (!sql) return res.status(404).json({ message: 'SQL lab not found' });
        res.json({ message: 'SQL lab removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
