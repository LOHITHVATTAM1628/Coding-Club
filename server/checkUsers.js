const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/codeforge').then(async () => {
    const users = await User.find({});
    console.log("USERS IN DB:");
    users.forEach(u => {
        console.log(`Email: ${u.email} | Role: ${u.role} | Status: ${u.status}`);
    });
    process.exit(0);
});
