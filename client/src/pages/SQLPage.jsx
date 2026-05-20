import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Editor from '@monaco-editor/react';
import { Database, Play, Check, ArrowLeft, Clock, Flame, Code } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SQLPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('-- Write your SQL query here\nSELECT * FROM employees;');
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [runResult, setRunResult] = useState(null);
    
    // Celebration State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [masterStreakUpdated, setMasterStreakUpdated] = useState(false);
    const [results, setResults] = useState(null);

    const isLocked = problem && (!problem.isToday || user?.completedSQLs?.includes(id));

    useEffect(() => {
        const fetchSQL = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/sql/today', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProblem(res.data);
            } catch (error) {
                console.error("Error fetching SQL problem", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSQL();
    }, [id]);

    const handleRunQuery = async () => {
        setRunning(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/sql/run', {
                sqlId: id,
                query
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRunResult(res.data);
        } catch (error) {
            setRunResult({ success: false, message: error.response?.data?.message || error.message });
        } finally {
            setRunning(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/sql/submit', {
                sqlId: id,
                query
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data.isAccepted) {
                setResults(res.data);
                
                if (res.data.masterStreakUpdated) {
                    setMasterStreakUpdated(true);
                    confetti({
                        particleCount: 200,
                        spread: 90,
                        origin: { y: 0.6 },
                        colors: ['#f97316', '#3b82f6', '#22c55e']
                    });
                } else {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#f97316', '#facc15'] // Orange/yellow for SQL
                    });
                }
                setShowSuccessModal(true);
            } else {
                setRunResult({ success: false, message: res.data.message, actual: res.data.actual, expected: res.data.expected });
            }
        } catch (error) {
            setRunResult({ success: false, message: error.response?.data?.message || error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const renderTable = (data, title) => {
        if (!data || data.length === 0) return <div className="text-slate-500 italic p-4">No data returned</div>;
        
        const cols = Object.keys(data[0]);
        return (
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
                {title && <div className="bg-slate-800 px-4 py-2 font-semibold text-slate-300 border-b border-slate-700">{title}</div>}
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-800/50">
                        <tr>
                            {cols.map(c => <th key={c} className="px-4 py-2 border-b border-slate-700">{c}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                                {cols.map(c => <td key={c} className="px-4 py-2">{row[c]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading) return <div className="min-h-screen text-white flex items-center justify-center">Loading SQL Lab...</div>;
    if (!problem) return <div className="min-h-screen text-white flex items-center justify-center">No SQL Challenge today.</div>;

    return (
        <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
            <Navbar />
            
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Description */}
                <div className="w-1/3 border-r border-slate-800 bg-slate-900 flex flex-col overflow-y-auto">
                    <div className="p-6">
                        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="w-6 h-6 text-orange-400" />
                            <h2 className="text-2xl font-bold text-white">{problem.title}</h2>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-semibold tracking-wider">
                                DAY {problem.day}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider
                                ${problem.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 
                                  problem.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-red-500/20 text-red-400'}`}>
                                {(problem.difficulty || 'easy').toUpperCase()}
                            </span>
                        </div>
                        
                        <div className="prose prose-invert max-w-none mb-8">
                            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-4">Task Description</h3>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{problem.description}</p>
                        </div>
                        
                        <div className="prose prose-invert max-w-none">
                            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-4">Schema Initialization Script</h3>
                            <pre className="bg-slate-950 p-4 rounded-lg text-sm text-blue-300 overflow-x-auto whitespace-pre-wrap font-mono border border-slate-800">
                                {problem.initSQL}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Editor and Output */}
                <div className="w-2/3 flex flex-col bg-slate-900">
                    <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                        <div className="text-slate-300 font-medium flex items-center gap-2">
                            <Code className="w-4 h-4" /> Editor
                        </div>
                        <div className="flex items-center gap-2">
                            {isLocked && !user?.completedSQLs?.includes(id) && (
                                <div className="text-yellow-500 text-sm font-medium mr-4">Read-Only</div>
                            )}
                            {!user?.completedSQLs?.includes(id) && (
                                <>
                                    <button 
                                        onClick={handleRunQuery} 
                                        disabled={running || submitting || isLocked}
                                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded text-sm font-medium transition disabled:opacity-50"
                                    >
                                        {running ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        Run Query
                                    </button>
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={running || submitting || isLocked}
                                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded text-sm font-medium transition disabled:opacity-50 shadow-lg shadow-orange-500/20"
                                    >
                                        {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Submit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                        <div className="h-1/2 relative border-b border-slate-800">
                            {user?.completedSQLs?.includes(id) ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                                    <div className="text-center p-8 glass-card border border-green-500/30">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                            <Check className="w-10 h-10 text-green-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-green-400 mb-2">✅ SQL COMPLETED</h2>
                                        <p className="text-slate-400">You have successfully solved this query challenge.</p>
                                    </div>
                                </div>
                            ) : (
                                <Editor
                                    height="100%"
                                    theme="vs-dark"
                                    language="sql"
                                    value={query}
                                    onChange={(val) => setQuery(val)}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        padding: { top: 16 },
                                        readOnly: isLocked
                                    }}
                                />
                            )}
                        </div>
                        
                        <div className="h-1/2 bg-[#0f172a] overflow-y-auto p-4 font-mono text-sm">
                            <h3 className="text-slate-400 font-semibold mb-4 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Query Result
                            </h3>
                            
                            {runResult ? (
                                runResult.success ? (
                                    renderTable(runResult.result)
                                ) : (
                                    <div>
                                        <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20 mb-4 whitespace-pre-wrap">
                                            Error: {runResult.message}
                                        </div>
                                        {runResult.expected && (
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    {renderTable(runResult.actual, "Your Output")}
                                                </div>
                                                <div className="flex-1">
                                                    {renderTable(runResult.expected, "Expected Output")}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="text-slate-500 text-center mt-10">
                                    Run your query to see results here.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl transform animate-in fade-in zoom-in duration-300">
                        {masterStreakUpdated ? (
                            <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(249,115,22,0.4)]">
                                <Flame className="w-12 h-12 text-orange-500" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                        )}
                        
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {masterStreakUpdated ? "DAILY PACK COMPLETE!" : "SQL Completed!"}
                        </h2>
                        <p className="text-slate-400 mb-6">
                            {masterStreakUpdated 
                                ? "You've conquered Coding, Quiz, and SQL for today!" 
                                : `Query executed correctly! (+30 pts)`}
                        </p>
                        
                        {masterStreakUpdated && (
                            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-6 mb-6 border border-orange-500/30">
                                <div className="text-orange-400 font-bold mb-2 flex items-center justify-center gap-2 animate-bounce">
                                    🔥 Master Streak Increased!
                                </div>
                                <div className="text-4xl font-black text-white">{results?.currentMasterStreak} <span className="text-base font-medium text-slate-400">Days</span></div>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => {
                                setShowSuccessModal(false);
                                navigate('/dashboard');
                            }}
                            className="w-full py-3 bg-[#35588E] hover:bg-blue-600 text-white rounded-lg font-medium transition shadow-lg shadow-blue-500/20"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
