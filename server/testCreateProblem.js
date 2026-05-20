const mongoose = require('mongoose');
const Problem = require('./models/Problem');

mongoose.connect('mongodb://127.0.0.1:27017/codeforge').then(async () => {
    try {
        const p = await Problem.create({
            day: 1,
            title: "Test Problem",
            difficulty: "easy",
            description: "Test description",
            unlockDate: "2026-05-18",
            timeLimit: 2000,
            memoryLimit: 256,
            constraints: ["1 <= n <= 10"],
            examples: [],
            testCases: [],
            hiddenTestCases: [],
            starterCode: { javascript: "", python: "", java: "", cpp: "" }
        });
        console.log("Successfully created problem:", p._id);
    } catch (e) {
        console.error("Mongoose validation error:", e);
    }
    process.exit(0);
});
