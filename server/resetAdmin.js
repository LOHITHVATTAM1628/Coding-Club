const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        await User.findOneAndUpdate(
            { email: 'admin@codeforge.com' },
            { password: hashedPassword, role: 'admin', status: 'active' },
            { upsert: true }
        );
        console.log('Admin password forcefully reset to: admin123');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetAdmin();
