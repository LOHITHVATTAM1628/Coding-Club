const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/codeforge').then(async () => {
    try {
        const email = 'gajulatulasi2505@gmail.com';
        const password = 'Password@123'; // Strong password meeting regex
        
        // Delete if exists to recreate
        await User.deleteOne({ email });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await User.create({
            name: 'Tulasi',
            email: email,
            password: hashedPassword,
            role: 'member',
            status: 'active'
        });
        
        console.log(`User ${email} created successfully with active status.`);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
