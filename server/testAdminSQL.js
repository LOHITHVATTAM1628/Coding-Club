require('dotenv').config({path: './.env'});
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const axios = require('axios');

async function testAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.log("No admin user found in DB!");
            process.exit(1);
        }
        
        console.log("Found admin:", adminUser.email, "Role:", adminUser.role);
        
        const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        console.log("Generated token, making request to http://localhost:5000/api/sql...");
        
        const response = await axios.post('http://localhost:5000/api/sql', {
            day: 999,
            title: "Test SQL",
            description: "Test",
            unlockDate: new Date(),
            initSQL: "CREATE TABLE t(id INT);",
            expectedOutput: "[]",
            difficulty: "easy"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("Request successful!", response.status);
        console.log("Response data:", response.data);
        
        // Cleanup
        const SQLProblem = require('./models/SQLProblem');
        await SQLProblem.findByIdAndDelete(response.data._id);
        console.log("Cleaned up test problem.");
        
    } catch (error) {
        console.error("Request failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testAdmin();
