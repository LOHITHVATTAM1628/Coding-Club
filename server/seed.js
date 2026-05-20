const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@codeforge.com';
        const password = 'adminpassword123'; // The password they should use

        // Check if admin already exists
        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin user already exists. Updating password to "adminpassword123"...');
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);
            admin.role = 'admin';
            admin.status = 'active';
            await admin.save();
            console.log('Admin user updated successfully.');
        } else {
            console.log('Creating admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await User.create({
                name: 'System Admin',
                email: email,
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });
            console.log('Admin user created successfully.');
        }

        console.log(`\nYou can now login with:\nEmail: ${email}\nPassword: ${password}\n`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
