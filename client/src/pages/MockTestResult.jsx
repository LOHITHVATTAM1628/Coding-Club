import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Trophy, AlertTriangle, Clock, CheckCircle, BarChart2, ShieldAlert } from 'lucide-react';

export default function MockTestResult() {
    const { id } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const token = localStorage.getItem('token');
                // The API /api/mock-tests/result/:id returns populated result
                const res = await axios.get(`/api/mock-tests/result/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResult(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold">Loading Results...</div>;
    if (!result) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Result not found.</div>;

    const { mockTestId, score, sectionPerformance, timeSpentSeconds, violationCount, status } = result;
    const isDisqualified = status === 'disqualified';

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Exam Results</h1>
                        <p className="text-slate-400">{mockTestId?.title || 'Mock Test'}</p>
                    </div>
                    <Link to="/dashboard" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">Back to Dashboard</Link>
                </div>

                {isDisqualified && (
                    <div className="mb-8 p-6 bg-red-950/50 border border-red-500 rounded-xl flex items-center gap-4">
                        <div className="p-4 bg-red-500/20 rounded-full">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-500 mb-1">Disqualified</h2>
                            <p className="text-red-200">Your exam was disqualified by the proctor due to excessive violations or suspicious activity.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6 border-b-4 border-b-blue-500 text-center">
                        <Trophy className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-slate-400 text-sm mb-1">Total Score</div>
                        <div className="text-3xl font-bold text-white">{score} <span className="text-lg text-slate-500">/ 100</span></div>
                    </div>
                    <div className="glass-card p-6 border-b-4 border-b-green-500 text-center">
                        <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-slate-400 text-sm mb-1">Time Spent</div>
                        <div className="text-3xl font-bold text-white">{Math.floor(timeSpentSeconds / 60)}m {timeSpentSeconds % 60}s</div>
                    </div>
                    <div className={`glass-card p-6 border-b-4 text-center ${violationCount > 0 ? 'border-b-red-500' : 'border-b-slate-500'}`}>
                        <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${violationCount > 0 ? 'text-red-500' : 'text-slate-500'}`} />
                        <div className="text-slate-400 text-sm mb-1">Violations Logged</div>
                        <div className={`text-3xl font-bold ${violationCount > 0 ? 'text-red-500' : 'text-white'}`}>{violationCount}</div>
                    </div>
                    <div className="glass-card p-6 border-b-4 border-b-purple-500 text-center">
                        <BarChart2 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <div className="text-slate-400 text-sm mb-1">Percentile</div>
                        <div className="text-3xl font-bold text-white">Top 15%</div>
                        <div className="text-xs text-slate-500 mt-1">Estimated</div>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" /> Section Performance
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(sectionPerformance).map(([section, data]) => {
                        // Safe rendering logic in case some sections are not present
                        if (!data) return null;
                        return (
                            <div key={section} className="glass-card p-6 border border-slate-800">
                                <h3 className="font-bold text-white capitalize mb-4 text-lg border-b border-slate-800 pb-2">{section}</h3>
                                <div className="flex justify-between items-end mb-4">
                                    <div className="text-slate-400 text-sm">Score</div>
                                    <div className="text-2xl font-bold text-white">{data.score} <span className="text-sm text-slate-500">/ {data.total || 0}</span></div>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full rounded-full" 
                                        style={{ width: `${data.total > 0 ? (data.score / data.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
