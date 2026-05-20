const mongoose = require('mongoose');
const Problem = require('./models/Problem');

mongoose.connect('mongodb://127.0.0.1:27017/codeforge').then(async () => {
    await Problem.deleteMany({ title: "Test Problem" });
    console.log("Deleted test problems");
    process.exit(0);
});
