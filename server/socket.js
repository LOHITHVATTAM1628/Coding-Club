const jwt = require('jsonwebtoken');
const ProctorSession = require('./models/ProctorSession');
const Violation = require('./models/Violation');
const User = require('./models/User');

module.exports = (io) => {
    // Map of candidateId -> socketId
    const candidateSockets = new Map();
    // Map of socketId -> sessionId
    const activeSessions = new Map();
    // Room for admins
    const ADMIN_ROOM = 'admins';

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        // Fetch user role
        const user = await User.findById(socket.user.id);
        if (!user) return socket.disconnect();

        if (user.role === 'admin') {
            socket.join(ADMIN_ROOM);
            
            socket.on('admin_action', (data) => {
                // data: { action: 'warn'|'pause'|'resume'|'disqualify', candidateId }
                const targetSocketId = candidateSockets.get(data.candidateId);
                if (targetSocketId) {
                    io.to(targetSocketId).emit('admin_command', { action: data.action });
                }
            });
            
            // Send existing active sessions to this admin
            (async () => {
                try {
                    const activeProctorSessions = await ProctorSession.find({ status: { $in: ['active', 'paused'] } }).populate('candidateId', 'name email');
                    const currentCandidates = activeProctorSessions.map(session => ({
                        sessionId: session._id,
                        candidate: { _id: session.candidateId._id, name: session.candidateId.name, email: session.candidateId.email },
                        examType: session.examType,
                        status: session.status,
                        riskScore: session.riskScore,
                        violations: [], // Violations count
                        integrityScore: Math.max(0, 100 - session.riskScore)
                    }));
                    socket.emit('initial_active_candidates', currentCandidates);
                } catch (err) {
                    console.error('Error fetching active sessions for admin', err);
                }
            })();

            socket.on('disconnect', () => {
                socket.leave(ADMIN_ROOM);
            });
            return;
        }

        // Candidate connection
        candidateSockets.set(user._id.toString(), socket.id);

        socket.on('start_session', async (data) => {
            // data: { examType, examId, deviceInfo, browserInfo }
            try {
                const session = await ProctorSession.create({
                    candidateId: user._id,
                    examType: data.examType || 'MockExam',
                    examId: data.examId || 'mock-1',
                    deviceInfo: data.deviceInfo,
                    browserInfo: data.browserInfo
                });
                
                activeSessions.set(socket.id, session._id);
                
                io.to(ADMIN_ROOM).emit('candidate_joined', {
                    sessionId: session._id,
                    candidate: { _id: user._id, name: user.name, email: user.email },
                    examType: session.examType,
                    status: session.status
                });
            } catch (err) {
                console.error('Error starting session', err);
            }
        });

        socket.on('candidate_activity', (data) => {
            // data: { progress, currentQuestion, riskScore, faceStatus }
            const sessionId = activeSessions.get(socket.id);
            if (!sessionId) return;
            
            io.to(ADMIN_ROOM).emit('candidate_update', {
                candidateId: user._id.toString(),
                sessionId,
                ...data
            });
        });

        socket.on('candidate_frame', (data) => {
            // data: { imageBase64 }
            const sessionId = activeSessions.get(socket.id);
            if (!sessionId) return;
            
            io.to(ADMIN_ROOM).emit('candidate_stream', {
                candidateId: user._id.toString(),
                frame: data.imageBase64
            });
        });

        socket.on('violation', async (data) => {
            // data: { type, description, snapshotBase64, moduleName }
            const sessionId = activeSessions.get(socket.id);
            if (!sessionId) return;
            
            // Map violations to risk levels
            let riskLevel = 'low';
            let penalty = 2;
            const highRisks = ['Copy Paste Attempt', 'Right Click Attempt', 'No Face Detected', 'Multiple Faces', 'Webcam Disabled', 'Long Inactivity'];
            const medRisks = ['Looking Away', 'Suspicious Movement', 'Tab Switched', 'Rapid Guessing', 'Execution Spam', 'Run Button Abuse'];
            
            if (highRisks.includes(data.type)) {
                riskLevel = 'high';
                penalty = 15;
            } else if (medRisks.includes(data.type)) {
                riskLevel = 'medium';
                penalty = 5;
            }
            
            try {
                // Save JSON event log exactly as requested
                const EventLog = require('./models/EventLog');
                await EventLog.create({
                    user: user.name,
                    event: data.type.toUpperCase().replace(/ /g, '_'),
                    module: data.moduleName || 'Mock Exam',
                    timestamp: new Date(),
                    risk: riskLevel
                });

                const session = await ProctorSession.findById(sessionId);
                let currentScore = 0;
                if (session) {
                    session.violationCount += 1;
                    session.riskScore += penalty;
                    await session.save();
                    currentScore = session.riskScore;

                    // Strict Rules Logic
                    if (session.violationCount > 15 || session.riskScore >= 100) {
                        socket.emit('admin_command', { action: 'force_submit' });
                        io.to(ADMIN_ROOM).emit('admin_alert', { 
                            message: `Candidate ${user.name} exceeded critical risk threshold. Auto-submitting exam.`,
                            type: 'critical'
                        });
                    } else if (session.riskScore > 50) {
                        io.to(ADMIN_ROOM).emit('admin_alert', { 
                            message: `High Risk Alert: Candidate ${user.name} integrity dropping.`,
                            type: 'warning'
                        });
                    }
                }

                const violation = await Violation.create({
                    sessionId,
                    type: data.type,
                    description: data.description,
                    snapshotBase64: data.snapshotBase64,
                    riskLevel
                });

                // Calculate AI Cheating Detection Score (0 - 100, where 100 is perfectly honest)
                const integrityScore = Math.max(0, 100 - currentScore);

                io.to(ADMIN_ROOM).emit('violation_alert', {
                    candidateId: user._id.toString(),
                    candidateName: user.name,
                    integrityScore,
                    violation
                });
            } catch (err) {
                console.error('Error recording violation', err);
            }
        });

        socket.on('disconnect', async () => {
            candidateSockets.delete(user._id.toString());
            const sessionId = activeSessions.get(socket.id);
            if (sessionId) {
                activeSessions.delete(socket.id);
                try {
                    await ProctorSession.findByIdAndUpdate(sessionId, { 
                        status: 'completed', 
                        endedAt: new Date() 
                    });
                    io.to(ADMIN_ROOM).emit('candidate_left', { candidateId: user._id.toString() });
                } catch (e) {}
            }
        });
    });
};
