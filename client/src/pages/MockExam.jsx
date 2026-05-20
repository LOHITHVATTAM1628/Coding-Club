import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ArrowLeft, Shield, Clock, BellOff } from 'lucide-react';

export default function MockExam() {
    const navigate = useNavigate();
    const [mockData, setMockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mockStatusInfo, setMockStatusInfo] = useState({ status: '', message: '' });

    useEffect(() => {
        let isMounted = true;
        const fetchTest = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const ts = new Date().getTime();
                const res = await axios.get(`/api/mock-tests/today?t=${ts}`, config);
                if (isMounted) setMockData(res.data);
            } catch (err) {
                console.error("Error fetching mock test", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchTest();
        const intervalId = setInterval(fetchTest, 15000);
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
        const interval = setInterval(checkMockStatus, 30000);
        return () => clearInterval(interval);
    }, [mockData]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-300">
            <Navbar />
            <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col">
                
                <div className="mb-8">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition w-fit">
                        <ArrowLeft className="w-5 h-5" /> Go back to Dashboard
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-8">
                    <Shield className="w-8 h-8 text-blue-500" />
                    <h1 className="text-3xl font-bold text-white">Mock Examination Hub</h1>
                </div>

                {!mockData?.test ? (
                    <div className="glass-card p-16 text-center flex flex-col items-center justify-center border border-slate-800">
                        <BellOff className="w-16 h-16 text-slate-600 mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">No Updates</h2>
                        <p className="text-slate-400 max-w-md">
                            There are no mock tests scheduled for today. When the admin updates or schedules a new mock test, it will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden border border-slate-700 shadow-2xl relative">
                        {/* Status Header */}
                        <div className={`p-4 flex items-center justify-between border-b
                            ${mockStatusInfo.status === 'live' ? 'bg-indigo-600/20 border-indigo-500/50' : 
                              mockStatusInfo.status === 'upcoming' ? 'bg-blue-500/10 border-blue-500/30' : 
                              mockStatusInfo.status === 'completed' ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                    ${mockStatusInfo.status === 'live' ? 'bg-indigo-600 text-white animate-pulse' : 
                                      mockStatusInfo.status === 'upcoming' ? 'bg-blue-500 text-white' : 
                                      mockStatusInfo.status === 'completed' ? 'bg-green-500 text-white' : 'bg-slate-600 text-white'}`}>
                                    {mockStatusInfo.status}
                                </span>
                                <span className="font-medium text-white">{mockStatusInfo.message}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>{mockData.test.durationMinutes} mins</span>
                            </div>
                        </div>

                        {/* Test Details */}
                        <div className="p-8">
                            <h2 className="text-3xl font-bold text-white mb-2">{mockData.test.title}</h2>
                            <p className="text-slate-400 mb-8 max-w-2xl">
                                This is a strictly proctored environment. Please ensure you have a working webcam. Navigating away from the exam tab or exiting fullscreen will be recorded as a violation.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-center">
                                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Coding Sections</div>
                                    <div className="text-xl text-white font-medium">{mockData.test.sections.coding.length}</div>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-center">
                                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">MCQ Sections</div>
                                    <div className="text-xl text-white font-medium">{mockData.test.sections.mcq.length}</div>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-center">
                                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">SQL Sections</div>
                                    <div className="text-xl text-white font-medium">{mockData.test.sections.sql.length}</div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-800">
                                {mockStatusInfo.status === 'upcoming' && (
                                    <button disabled className="px-8 py-3 bg-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed">Starts soon...</button>
                                )}
                                {mockStatusInfo.status === 'live' && (
                                    <Link to={`/mock-exam/active/${mockData.test._id}`} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] transition">
                                        Enter Exam Environment
                                    </Link>
                                )}
                                {(mockStatusInfo.status === 'closed' || mockStatusInfo.status === 'missed') && (
                                    <button disabled className="px-8 py-3 bg-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed">Exam Closed</button>
                                )}
                                {mockStatusInfo.status === 'completed' && (
                                    <Link to={`/mock-results/${mockData.resultId}`} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(22,163,74,0.4)] transition">
                                        View Results
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
