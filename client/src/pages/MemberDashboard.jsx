import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { Flame, Trophy, Calendar, CheckCircle, Zap, Code, Clock, HelpCircle, Database, Lock } from 'lucide-react';

export default function MemberDashboard() {
    const { user } = useContext(AuthContext);
    const [todayCoding, setTodayCoding] = useState(null);
    const [todayMCQ, setTodayMCQ] = useState(null);
    const [todaySQL, setTodaySQL] = useState(null);
    const [mockData, setMockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');
    const [mockStatusInfo, setMockStatusInfo] = useState({ status: '', message: '' });

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setHours(24, 0, 0, 0);
            const diff = tomorrow - now;
            
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
            const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
            const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            
            setTimeLeft(`${h}h ${m}m ${s}s`);
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const ts = new Date().getTime();
                const [codingRes, mcqRes, sqlRes, mockRes] = await Promise.all([
                    axios.get(`/api/problems/today?t=${ts}`, config).catch(() => ({ data: null })),
                    axios.get(`/api/mcqs/today?t=${ts}`, config).catch(() => ({ data: null })),
                    axios.get(`/api/sql/today?t=${ts}`, config).catch(() => ({ data: null })),
                    axios.get(`/api/mock-tests/today?t=${ts}`, config).catch(() => ({ data: null }))
                ]);
                
                if (isMounted) {
                    setTodayCoding(codingRes.data);
                    setTodayMCQ(mcqRes.data);
                    setTodaySQL(sqlRes.data);
                    setMockData(mockRes.data);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching dashboard data", error);
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        const intervalId = setInterval(fetchData, 15000); // Auto-update every 15 seconds
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!mockData || !mockData.test) return;
        
        if (mockData.submitted) {
            setMockStatusInfo({ status: 'completed', message: 'You have completed this exam.' });
            return;
        }

        const checkMockStatus = () => {
            const now = new Date();
            const testDate = new Date(mockData.test.scheduledDate);
            const [hours, minutes] = mockData.test.startTime.split(':').map(Number);
            testDate.setHours(hours, minutes, 0, 0);

            const graceEnd = new Date(testDate.getTime() + mockData.test.graceTimeMinutes * 60000);
            const examEnd = new Date(testDate.getTime() + mockData.test.durationMinutes * 60000);

            if (now < testDate) {
                setMockStatusInfo({ status: 'upcoming', message: `Starts at ${mockData.test.startTime}` });
            } else if (now >= testDate && now <= graceEnd) {
                setMockStatusInfo({ status: 'live', message: 'Exam is live. Join now!' });
            } else if (now > graceEnd && now < examEnd) {
                setMockStatusInfo({ status: 'closed', message: 'Entry Closed. Late joining not allowed.' });
            } else {
                setMockStatusInfo({ status: 'missed', message: 'Exam has ended.' });
            }
        };

        checkMockStatus();
        const interval = setInterval(checkMockStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [mockData]);

    if (loading) return <div className="min-h-screen text-white flex items-center justify-center">Loading dashboard...</div>;

    const codingDone = user?.completedProblems?.includes(todayCoding?._id);
    const mcqDone = user?.completedMCQs?.includes(todayMCQ?._id);
    const sqlDone = user?.completedSQLs?.includes(todaySQL?._id);
    
    let completedCount = 0;
    if (codingDone) completedCount++;
    if (mcqDone) completedCount++;
    if (sqlDone) completedCount++;

    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-orange-500">
                        <div className="p-3 bg-orange-500/20 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                            <Flame className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white">{user?.masterStreak || 0}</div>
                            <div className="text-sm text-slate-400">Master Streak</div>
                        </div>
                    </div>
                    <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-[#35588E]">
                        <div className="p-3 bg-blue-500/20 rounded-full">
                            <Trophy className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white">{user?.points || 0}</div>
                            <div className="text-sm text-slate-400">Total Points</div>
                        </div>
                    </div>
                    <div className="glass-card p-6 flex items-center justify-between gap-4 border-l-4 border-l-green-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-full">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-white">{completedCount}/3</div>
                                <div className="text-sm text-slate-400">Today's Progress</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Mock Test Banner */}
                {mockData?.test && (
                    <div className={`mb-10 rounded-2xl p-1 relative overflow-hidden bg-gradient-to-r 
                        ${mockStatusInfo.status === 'live' ? 'from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x' : 'from-slate-800 to-slate-800 border border-slate-700'}`}>
                        <div className="bg-slate-900 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                        ${mockStatusInfo.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                                          mockStatusInfo.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' : 
                                          mockStatusInfo.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                                        {mockStatusInfo.status}
                                    </span>
                                    <span className="text-slate-400 font-medium">{mockData.test.durationMinutes} mins • {mockData.test.sections.coding.length + mockData.test.sections.mcq.length + mockData.test.sections.sql.length} Sections</span>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">{mockData.test.title}</h2>
                                <p className="text-slate-400 max-w-2xl">{mockStatusInfo.message} • Grace period: {mockData.test.graceTimeMinutes} mins.</p>
                            </div>
                            
                            <div className="flex-shrink-0 w-full md:w-auto">
                                {mockStatusInfo.status === 'upcoming' && (
                                    <button disabled className="w-full md:w-auto px-8 py-3 bg-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed border border-slate-700">Waiting...</button>
                                )}
                                {mockStatusInfo.status === 'live' && (
                                    <Link to={`/mock-exam/active/${mockData.test._id}`} className="block w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] text-center transition">Start Exam</Link>
                                )}
                                {(mockStatusInfo.status === 'closed' || mockStatusInfo.status === 'missed') && (
                                    <button disabled className="w-full md:w-auto px-8 py-3 bg-red-950/50 text-red-500 font-bold rounded-lg border border-red-500/30 cursor-not-allowed">Entry Closed</button>
                                )}
                                {mockStatusInfo.status === 'completed' && (
                                    <Link to={`/mock-results/${mockData.resultId}`} className="block w-full md:w-auto px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(22,163,74,0.4)] text-center transition">View Result</Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-yellow-400" /> Daily Challenge Pack
                    </h2>
                    <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50 text-sm">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-400">Next pack in:</span>
                        <span className="font-mono text-blue-400 font-medium text-base">{timeLeft}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Coding Arena */}
                    <div className="glass-card p-6 relative overflow-hidden group flex flex-col h-[280px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition duration-500 pointer-events-none">
                            <Code className="w-40 h-40" />
                        </div>
                        <div className="flex items-center justify-between mb-4 z-10">
                            <div className="flex items-center gap-2 text-blue-400 font-bold">
                                <Code className="w-5 h-5" /> Coding Arena
                            </div>
                            {codingDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        {todayCoding ? (
                            <div className="flex flex-col flex-1 z-10">
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{todayCoding.title}</h3>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">{todayCoding.description}</p>
                                {codingDone ? (
                                    <div className="w-full py-2 bg-green-500/10 text-green-400 text-center rounded-lg font-medium border border-green-500/20">✅ Completed</div>
                                ) : (
                                    <Link to={`/problem/${todayCoding._id}`} className="w-full py-2 bg-[#35588E] hover:bg-blue-600 text-center text-white rounded-lg font-medium transition">Solve (+50 pts)</Link>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 z-10 opacity-50">
                                <Lock className="w-8 h-8 mb-2" />
                                <span>No challenge</span>
                            </div>
                        )}
                    </div>

                    {/* Quiz Arena */}
                    <div className="glass-card p-6 relative overflow-hidden group flex flex-col h-[280px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition duration-500 pointer-events-none">
                            <HelpCircle className="w-40 h-40" />
                        </div>
                        <div className="flex items-center justify-between mb-4 z-10">
                            <div className="flex items-center gap-2 text-purple-400 font-bold">
                                <HelpCircle className="w-5 h-5" /> Quiz Arena (MCQs)
                            </div>
                            {mcqDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        {todayMCQ ? (
                            <div className="flex flex-col flex-1 z-10">
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{todayMCQ.title}</h3>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">Complete {todayMCQ.questions?.length || 10} multiple choice questions. You only get one attempt.</p>
                                {mcqDone ? (
                                    <div className="w-full py-2 bg-green-500/10 text-green-400 text-center rounded-lg font-medium border border-green-500/20">✅ Completed</div>
                                ) : (
                                    <Link to={`/quiz/${todayMCQ._id}`} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-center text-white rounded-lg font-medium transition">Start Quiz (+20 pts)</Link>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 z-10 opacity-50">
                                <Lock className="w-8 h-8 mb-2" />
                                <span>No challenge</span>
                            </div>
                        )}
                    </div>

                    {/* SQL Lab */}
                    <div className="glass-card p-6 relative overflow-hidden group flex flex-col h-[280px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition duration-500 pointer-events-none">
                            <Database className="w-40 h-40" />
                        </div>
                        <div className="flex items-center justify-between mb-4 z-10">
                            <div className="flex items-center gap-2 text-orange-400 font-bold">
                                <Database className="w-5 h-5" /> SQL Lab
                            </div>
                            {sqlDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        {todaySQL ? (
                            <div className="flex flex-col flex-1 z-10">
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{todaySQL.title}</h3>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">{todaySQL.description}</p>
                                {sqlDone ? (
                                    <div className="w-full py-2 bg-green-500/10 text-green-400 text-center rounded-lg font-medium border border-green-500/20">✅ Completed</div>
                                ) : (
                                    <Link to={`/sql/${todaySQL._id}`} className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-center text-white rounded-lg font-medium transition">Write Query (+30 pts)</Link>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 z-10 opacity-50">
                                <Lock className="w-8 h-8 mb-2" />
                                <span>No challenge</span>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
