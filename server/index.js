const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const mcqRoutes = require('./routes/mcqs');
const sqlRoutes = require('./routes/sqls');
const adminRoutes = require('./routes/admin');
const resourceRoutes = require('./routes/resources');

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/mcqs', mcqRoutes);
app.use('/api/sql', sqlRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resources', resourceRoutes);

const mockTestRoutes = require('./routes/mockTests');
app.use('/api/mock-tests', mockTestRoutes);

const path = require('path');

// Serve frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

require('./socket')(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
