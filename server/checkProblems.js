const mongoose = require('mongoose');
const Problem = require('./models/Problem');

mongoose.connect('mongodb://127.0.0.1:27017/codeforge').then(async () => {
    const problems = await Problem.find({});
    console.log("PROBLEMS IN DB:", problems.length);
    problems.forEach(p => {
        console.log(`Title: ${p.title} | Day: ${p.day} | Unlock Date: ${p.unlockDate}`);
    });
    process.exit(0);
});
