import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, CheckCircle, Shield, AlertTriangle, User, Users, CameraOff, Video } from 'lucide-react';
import { io } from 'socket.io-client';
import * as faceapi from 'face-api.js';

export default function ActiveMockTest() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [testData, setTestData] = useState(null);
    const [answers, setAnswers] = useState({ coding: {}, mcq: {}, sql: {} });
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeSection, setActiveSection] = useState('mcq');
    
    // Proctoring State
    const [integrityScore, setIntegrityScore] = useState(100);
    const [violations, setViolations] = useState(0);
    const [faceStatus, setFaceStatus] = useState('Detecting...');
    const [isCameraActive, setIsCameraActive] = useState(false);
    
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const proctorIntervalRef = useRef(null);

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/mock-tests/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTestData(res.data);
                setTimeLeft(res.data.durationMinutes * 60);

                // Set initial active section
                if (res.data.sections.mcq.length > 0) setActiveSection('mcq');
                else if (res.data.sections.coding.length > 0) setActiveSection('coding');
                else if (res.data.sections.sql.length > 0) setActiveSection('sql');
                
                // Initialize Socket
                initSocket();
                // Start Proctoring Engine
                startProctoring();
                
            } catch (err) {
                console.error(err);
                alert("Failed to load test.");
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchTest();

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
            stopCamera();
        };
    }, [id, navigate]);

    const initSocket = () => {
        const token = localStorage.getItem('token');
        const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
        socketRef.current = io(socketUrl, {
            auth: { token }
        });

        socketRef.current.on('connect', () => {
            socketRef.current.emit('start_session', {
                examType: 'MockExam',
                examId: id,
                deviceInfo: { platform: navigator.platform, userAgent: navigator.userAgent },
                browserInfo: { language: navigator.language }
            });
        });

        socketRef.current.on('admin_command', (data) => {
            if (data.action === 'warn') {
                alert("⚠️ ADMIN WARNING: Please stay focused on the exam and ensure your face is visible.");
            } else if (data.action === 'force_submit') {
                handleAutoSubmit();
            }
        });
    };

    const startProctoring = async () => {
        try {
            // Load face-api models
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);

            // Start Camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }

            // Behavioral Monitoring (Tab Switch)
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    recordViolation('Tab Switched', 'Candidate navigated away from the exam tab.');
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            // Detection Loop
            proctorIntervalRef.current = setInterval(async () => {
                if (videoRef.current && socketRef.current && !submitting) {
                    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
                    
                    let status = 'Good';
                    if (detections.length === 0) {
                        status = 'No Face Detected';
                        recordViolation('No Face Detected', 'Candidate is not visible in the camera frame.');
                    } else if (detections.length > 1) {
                        status = 'Multiple Faces Detected';
                        recordViolation('Multiple Faces', 'More than one person detected in the frame.');
                    }
                    
                    setFaceStatus(status);

                    // Send Snapshot to Admin
                    const canvas = document.createElement('canvas');
                    canvas.width = videoRef.current.videoWidth / 4;
                    canvas.height = videoRef.current.videoHeight / 4;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                    const base64Frame = canvas.toDataURL('image/jpeg', 0.5);
                    
                    socketRef.current.emit('candidate_frame', { imageBase64: base64Frame });
                    socketRef.current.emit('candidate_activity', {
                        faceStatus: status,
                        integrityScore,
                        currentQuestion: activeSection
                    });
                }
            }, 3000);

        } catch (err) {
            console.error("Proctoring setup failed", err);
            setIsCameraActive(false);
            setFaceStatus('Camera Error');
            // If camera is mandatory, we might want to prevent start, but for now we record it as a violation
            recordViolation('Webcam Disabled', 'Candidate camera is not working or blocked.');
        }
    };

    const recordViolation = (type, description) => {
        if (submitting) return;

        // Take snapshot for violation
        let snapshot = null;
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            snapshot = canvas.toDataURL('image/jpeg', 0.7);
        }

        socketRef.current.emit('violation', {
            type,
            description,
            snapshotBase64: snapshot,
            moduleName: 'Mock Exam'
        });

        setViolations(prev => prev + 1);
        // Penalty logic matches server
        const highRisks = ['Copy Paste Attempt', 'Right Click Attempt', 'No Face Detected', 'Multiple Faces', 'Webcam Disabled'];
        const penalty = highRisks.includes(type) ? 15 : 5;
        setIntegrityScore(prev => Math.max(0, prev - penalty));
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    // Timer logic
    useEffect(() => {
        if (timeLeft === null || submitting) return;
        if (timeLeft <= 0) {
            handleAutoSubmit();
            return;
        }
        
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        
        return () => clearInterval(timerId);
    }, [timeLeft, submitting]);

    // Strict UI Enforcement
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F12' || 
               (e.ctrlKey && e.shiftKey && e.key === 'I') || 
               (e.ctrlKey && e.key === 'u') || 
               (e.ctrlKey && e.key === 'c') || 
               (e.ctrlKey && e.key === 'v')) {
                e.preventDefault();
                recordViolation('Forbidden Key Pressed', `Attempted to use key: ${e.key}`);
                alert("This action is disabled during the exam.");
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            recordViolation('Right Click Attempt', 'Candidate tried to open context menu.');
        };

        const handleCopyPaste = (e) => {
            e.preventDefault();
            recordViolation('Copy Paste Attempt', 'Candidate tried to copy or paste content.');
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);

        // Try to request fullscreen
        const requestFullscreen = () => {
            if (containerRef.current && !document.fullscreenElement) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.log("Fullscreen request failed", err);
                });
            }
        };
        document.addEventListener('click', requestFullscreen, { once: true });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
        };
    }, []);

    const handleAutoSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        stopCamera();
        try {
            const token = localStorage.getItem('token');
            
            // Calculate MCQ Score
            let mcqScore = 0;
            testData.sections.mcq.forEach(q => {
                const selected = answers.mcq[q._id];
                if (selected !== undefined && selected === q.correctOption) {
                    mcqScore += 10;
                }
            });

            const resultData = {
                answers,
                timeSpentSeconds: (testData.durationMinutes * 60) - timeLeft,
                violationCount: violations,
                integrityScore,
                sectionPerformance: {
                    mcq: { score: mcqScore, total: testData.sections.mcq.length * 10, timeSpent: 0 }
                }
            };

            const res = await axios.post(`/api/mock-tests/${id}/submit`, resultData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            document.exitFullscreen?.();
            setTimeout(() => {
                navigate(`/mock-results/${res.data._id}`);
            }, 3000);
            
        } catch (err) {
            console.error("Submit failed", err);
            setSubmitting(false);
            alert("Failed to submit exam!");
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xl font-bold">Loading Exam Environment...</div>;
    
    if (submitting) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <CheckCircle className="w-24 h-24 text-green-500 mb-6 animate-bounce" />
                <h1 className="text-4xl font-bold mb-4">Exam Submitted Successfully</h1>
                <p className="text-slate-400">Saving your responses and redirecting...</p>
            </div>
        );
    }

    const formatTime = (sec) => {
        const h = Math.floor(sec / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
            <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-10 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">CF</div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight">{testData.title}</h1>
                        <div className="text-sm text-slate-400">Candidate: {localStorage.getItem('userName') || 'Student'}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* Proctoring Status Pill */}
                    <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <Shield className={`w-3.5 h-3.5 ${integrityScore > 70 ? 'text-green-500' : 'text-yellow-500'}`} />
                            <span className="text-slate-400">Integrity:</span>
                            <span className={integrityScore > 70 ? 'text-green-500' : 'text-yellow-500'}>{integrityScore}%</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700"></div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <AlertTriangle className={`w-3.5 h-3.5 ${violations > 5 ? 'text-red-500' : 'text-slate-500'}`} />
                            <span className="text-slate-400">Violations:</span>
                            <span className={violations > 5 ? 'text-red-500' : 'text-slate-300'}>{violations}</span>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg border shadow-lg
                        ${timeLeft < 300 ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse' : 'bg-slate-800 text-white border-slate-700'}`}>
                        <Clock className="w-5 h-5" />
                        {formatTime(timeLeft)}
                    </div>
                    <button onClick={handleAutoSubmit} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition shadow-lg shadow-green-500/20">
                        Submit Exam
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Sections & Camera */}
                <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
                    {/* Live Camera Preview */}
                    <div className="p-4 border-b border-slate-800">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-inner group">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all" />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-tighter border border-white/10">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                Live Proctoring
                            </div>
                            {!isCameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                                    <CameraOff className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-medium">Camera Disabled</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest px-1">
                            <span className="text-slate-500">AI Status:</span>
                            <span className={`transition-colors ${faceStatus === 'Good' ? 'text-green-500' : 'text-red-500'}`}>
                                {faceStatus}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                        <h3 className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4">Exam Sections</h3>
                        <div className="space-y-2">
                            {testData.sections.mcq.length > 0 && (
                                <button onClick={() => setActiveSection('mcq')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition flex items-center justify-between
                                    ${activeSection === 'mcq' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <span>Multiple Choice</span>
                                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">{testData.sections.mcq.length}</span>
                                </button>
                            )}
                            {testData.sections.coding.length > 0 && (
                                <button onClick={() => setActiveSection('coding')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition flex items-center justify-between
                                    ${activeSection === 'coding' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <span>Coding Problems</span>
                                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">{testData.sections.coding.length}</span>
                                </button>
                            )}
                            {testData.sections.sql.length > 0 && (
                                <button onClick={() => setActiveSection('sql')} className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition flex items-center justify-between
                                    ${activeSection === 'sql' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <span>SQL Labs</span>
                                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">{testData.sections.sql.length}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-xs font-bold text-white truncate">{localStorage.getItem('userName') || 'Candidate'}</div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">Active Session</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-8 bg-[#0a0f1c] scrollbar-thin scrollbar-thumb-slate-800">
                    <div className="max-w-4xl mx-auto">
                        {activeSection === 'mcq' && testData.sections.mcq.map((q, i) => (
                            <div key={q._id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl transition-all hover:border-slate-700">
                                <div className="flex items-start gap-4 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold shrink-0">
                                        {i + 1}
                                    </div>
                                    <h3 className="text-xl text-white font-semibold leading-relaxed">
                                        {q.questionText}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {q.options.map((opt, oIdx) => (
                                        <label key={oIdx} className={`group flex items-center gap-4 p-5 rounded-2xl cursor-pointer border transition-all duration-300
                                            ${answers.mcq[q._id] === oIdx ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}>
                                            <input type="radio" name={`q_${q._id}`} className="hidden" 
                                                checked={answers.mcq[q._id] === oIdx}
                                                onChange={() => setAnswers(prev => ({ ...prev, mcq: { ...prev.mcq, [q._id]: oIdx } }))}
                                            />
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                                ${answers.mcq[q._id] === oIdx ? 'border-white bg-white' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${answers.mcq[q._id] === oIdx ? 'bg-blue-600' : 'transparent'}`}></div>
                                            </div>
                                            <span className="font-medium text-lg">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        {activeSection === 'coding' && testData.sections.coding.map((p, i) => (
                            <div key={p._id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-500 font-bold">
                                        {i + 1}
                                    </div>
                                    <h3 className="text-xl text-white font-bold">{p.title}</h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                        ${p.difficulty === 'easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                          p.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                        {p.difficulty}
                                    </span>
                                </div>
                                <div className="prose prose-invert max-w-none mb-8">
                                    <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 italic">
                                        {p.description}
                                    </p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#1e1e1e] text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-700 rounded z-10">
                                        Editor
                                    </div>
                                    <textarea 
                                        className="w-full h-96 bg-[#1e1e1e] text-blue-400 font-mono p-6 pt-8 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm leading-relaxed"
                                        placeholder="// Write your code here..."
                                        spellCheck="false"
                                        value={answers.coding[p._id] || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, coding: { ...prev.coding, [p._id]: e.target.value } }))}
                                    ></textarea>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-slate-500">
                                    <Shield className="w-4 h-4" />
                                    <p className="text-xs font-medium">Code is being monitored. Plagiarism detection is active.</p>
                                </div>
                            </div>
                        ))}

                        {activeSection === 'sql' && testData.sections.sql.map((s, i) => (
                            <div key={s._id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/30 flex items-center justify-center text-orange-500 font-bold">
                                        {i + 1}
                                    </div>
                                    <h3 className="text-xl text-white font-bold">{s.title}</h3>
                                </div>
                                <div className="prose prose-invert max-w-none mb-8">
                                    <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                                        {s.description}
                                    </p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#1e1e1e] text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-700 rounded z-10">
                                        SQL Console
                                    </div>
                                    <textarea 
                                        className="w-full h-48 bg-[#1e1e1e] text-orange-400 font-mono p-6 pt-8 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-lg"
                                        placeholder="SELECT * FROM table_name..."
                                        spellCheck="false"
                                        value={answers.sql[s._id] || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, sql: { ...prev.sql, [s._id]: e.target.value } }))}
                                    ></textarea>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
            
            {/* Hidden canvas for face-api processing if needed */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
