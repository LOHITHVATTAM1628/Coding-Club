import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import Editor from '@monaco-editor/react';
import { Play, Check, ArrowLeft, Clock, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ProblemPage() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [problem, setProblem] = useState(null);
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [runResults, setRunResults] = useState(null);
    const [showConsole, setShowConsole] = useState(false);
    
    // Celebration State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [streakData, setStreakData] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    const isLocked = problem && (!problem.isToday || user?.completedProblems?.includes(id));

    // Countdown Timer logic for Midnight
    useEffect(() => {
        if (!showSuccessModal) return;
        
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
    }, [showSuccessModal]);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/problems/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProblem(res.data);
                setCode(res.data.starterCode[language] || '// Write your code here');
            } catch (error) {
                console.error('Error fetching problem', error);
                navigate('/dashboard');
            }
        };
        fetchProblem();
    }, [id, navigate, language]);

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        if (problem && problem.starterCode[newLang]) {
            setCode(problem.starterCode[newLang]);
        }
    };

    const handleRunCode = async () => {
        setRunning(true);
        setShowConsole(true);
        setRunResults(null);
        setResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/submissions/run', {
                problemId: id,
                code,
                language
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRunResults(res.data.results);
        } catch (error) {
            setRunResults([{ passed: false, error: error.response?.data?.message || 'Server error during execution.' }]);
        } finally {
            setRunning(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setShowConsole(true);
        setResult(null);
        setRunResults(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/submissions', {
                problemId: id,
                code,
                language
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data.isAccepted) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#22c55e', '#3b82f6', '#eab308']
                });
                
                setStreakData({
                    updated: res.data.streakUpdated,
                    streak: res.data.currentStreak
                });
                setShowSuccessModal(true);
                
                // Fetch updated user profile in background so dashboard reflects it
                try {
                    const profileRes = await axios.get('/api/users/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    // Assuming auth context could be updated here if we had a function for it
                    // The dashboard will refetch anyway on mount.
                } catch(e) {}

            } else if (res.data.status === 'solved') {
                setResult({ success: true, message: 'All test cases passed! Points awarded.' });
            } else {
                setResult({ 
                    success: false, 
                    message: 'Test cases failed. Try again.',
                    details: res.data.details
                });
            }
        } catch (error) {
            setResult({ success: false, message: 'Server error during submission.', details: error.response?.data?.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (!problem) return <div className="min-h-screen text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen flex flex-col h-screen overflow-hidden bg-slate-900">
            <Navbar />
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Problem Details */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-slate-800">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    
                    <div className="flex items-center gap-3 mb-4">
                        <h1 className="text-3xl font-bold text-white">{problem.title}</h1>
                        <span className={`px-2 py-1 rounded text-xs font-semibold
                            ${problem.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 
                              problem.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            {problem.difficulty.toUpperCase()}
                        </span>
                    </div>
                    
                    <div className="prose prose-invert max-w-none mb-8">
                        <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">{problem.description}</div>
                    </div>

                    <div className="space-y-6">
                        {problem.examples && problem.examples.map((ex, idx) => (
                            <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                <h3 className="text-white font-bold mb-2">Example {idx + 1}:</h3>
                                <div className="mb-2"><span className="text-slate-400 font-medium">Input:</span> <span className="text-blue-300 font-mono text-sm">{ex.input}</span></div>
                                <div className="mb-2"><span className="text-slate-400 font-medium">Output:</span> <span className="text-green-300 font-mono text-sm">{ex.output}</span></div>
                                {ex.explanation && <div><span className="text-slate-400 font-medium">Explanation:</span> <span className="text-slate-300">{ex.explanation}</span></div>}
                            </div>
                        ))}
                    </div>

                    {problem.constraints && problem.constraints.length > 0 && (
                        <div className="mt-8 mb-8">
                            <h3 className="text-white font-bold mb-2">Constraints:</h3>
                            <ul className="list-disc list-inside text-slate-300 space-y-1 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                                {problem.constraints.map((c, i) => (
                                    <li key={i} className="font-mono text-sm">{c}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {problem.testCases && problem.testCases.length > 0 && (
                        <div className="space-y-4 mb-8">
                            <h3 className="text-white font-bold mb-2 border-b border-slate-700 pb-2">Execution Limits & Info</h3>
                            <div className="flex gap-4 mb-4">
                                <div className="bg-slate-800/50 px-4 py-2 rounded border border-slate-700 text-sm">
                                    <span className="text-slate-400">Time Limit:</span> <span className="text-white font-medium">{problem.timeLimit || 2000} ms</span>
                                </div>
                                <div className="bg-slate-800/50 px-4 py-2 rounded border border-slate-700 text-sm">
                                    <span className="text-slate-400">Memory Limit:</span> <span className="text-white font-medium">{problem.memoryLimit || 256} MB</span>
                                </div>
                            </div>

                            <h3 className="text-white font-bold mb-2">Additional Test Cases:</h3>
                            {problem.testCases.map((tc, idx) => (
                                <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <h4 className="text-slate-400 font-bold mb-2 text-sm">Test Case {idx + 1}</h4>
                                    <div className="mb-2"><span className="text-slate-400 font-medium text-xs">Input:</span> <pre className="text-blue-300 font-mono text-sm bg-slate-900 p-2 rounded mt-1 overflow-x-auto">{tc.input}</pre></div>
                                    <div><span className="text-slate-400 font-medium text-xs">Output:</span> <pre className="text-green-300 font-mono text-sm bg-slate-900 p-2 rounded mt-1 overflow-x-auto">{tc.output}</pre></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel: Editor */}
                <div className="w-full md:w-1/2 flex flex-col bg-[#1e1e1e]">
                    <div className="bg-slate-900 border-b border-slate-800 p-2 flex justify-between items-center">
                        <select 
                            value={language} 
                            onChange={handleLanguageChange}
                            className="bg-slate-800 text-slate-300 px-3 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                        
                        <div className="flex items-center gap-2">
                            {isLocked && !user?.completedProblems?.includes(id) && (
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded text-sm font-medium border border-slate-700/50">
                                    <Lock className="w-4 h-4" /> Read-Only
                                </div>
                            )}
                            {(!user?.completedProblems?.includes(id)) && (
                                <>
                                    <button 
                                        onClick={handleRunCode} 
                                        disabled={running || submitting || isLocked}
                                        className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition
                                            ${isLocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                    >
                                        {running ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        Run Code
                                    </button>
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={submitting || isLocked}
                                        className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition shadow-lg
                                            ${isLocked ? 'bg-slate-800 text-slate-500 shadow-none cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20'}`}
                                    >
                                        {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Submit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 min-h-[300px] relative">
                            {user?.completedProblems?.includes(id) ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                                    <div className="text-center p-8 glass-card border border-green-500/30">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                            <Check className="w-10 h-10 text-green-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-green-400 mb-2">✅ COMPLETED</h2>
                                        <p className="text-slate-400">You have successfully solved this challenge.</p>
                                    </div>
                                </div>
                            ) : (
                                <Editor
                                    height="100%"
                                    theme="vs-dark"
                                    language={language}
                                    value={code}
                                    onChange={(val) => setCode(val)}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        padding: { top: 16 },
                                        readOnly: isLocked
                                    }}
                                />
                            )}
                        </div>

                        {/* Console Panel */}
                        {showConsole && (
                            <div className="h-64 border-t border-slate-700 bg-slate-900 flex flex-col">
                                <div className="flex justify-between items-center p-2 border-b border-slate-800 bg-slate-800/50">
                                    <span className="text-sm font-semibold text-slate-300 px-2">Console Output</span>
                                    <button onClick={() => setShowConsole(false)} className="text-slate-400 hover:text-white text-sm px-2">Close</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                                    {running || submitting ? (
                                        <div className="text-slate-400 animate-pulse">Executing code on remote sandbox...</div>
                                    ) : runResults ? (
                                        <div className="space-y-4">
                                            {runResults.map((res, i) => (
                                                <div key={i} className={`p-3 rounded border ${res.passed ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                                    <div className={`font-bold mb-1 ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                        Test Case {i + 1}: {res.passed ? 'Passed' : 'Failed'}
                                                    </div>
                                                    {!res.passed && res.error && (
                                                        <div className="text-red-300 mt-2 whitespace-pre-wrap">{res.error}</div>
                                                    )}
                                                    {!res.passed && !res.error && (
                                                        <div className="mt-2 space-y-1">
                                                            <div className="text-slate-400 text-xs">Expected Output:</div>
                                                            <div className="text-slate-200 bg-slate-950 p-1 rounded whitespace-pre-wrap">{res.expected}</div>
                                                            <div className="text-slate-400 text-xs mt-2">Actual Output:</div>
                                                            <div className="text-red-300 bg-slate-950 p-1 rounded whitespace-pre-wrap">{res.actual || '<Empty Output>'}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : result ? (
                                        <div className={`p-4 rounded border ${result.success ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-red-500/50 bg-red-500/10 text-red-400'}`}>
                                            <div className="font-bold mb-2 flex items-center gap-2">
                                                {result.success ? <Check className="w-5 h-5"/> : null} 
                                                {result.message}
                                            </div>
                                            {result.details && (
                                                <div className="mt-2 text-sm text-red-300 whitespace-pre-wrap bg-slate-950 p-3 rounded">
                                                    {result.details}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-500">No output yet.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                            <Check className="w-10 h-10 text-green-500" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-2">Problem Solved!</h2>
                        <p className="text-slate-400 mb-6">You've successfully conquered today's challenge.</p>
                        
                        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
                            {streakData?.updated ? (
                                <div className="text-orange-400 font-bold mb-1 flex items-center justify-center gap-2 animate-bounce">
                                    🔥 Streak Updated!
                                </div>
                            ) : (
                                <div className="text-slate-300 font-medium mb-1 flex items-center justify-center gap-2">
                                    🔥 Current Streak
                                </div>
                            )}
                            <div className="text-3xl font-black text-white">{streakData?.streak || 0} <span className="text-sm font-medium text-slate-400">Days</span></div>
                        </div>
                        
                        <div className="text-sm text-slate-400 mb-6">
                            Next challenge unlocks in:
                            <div className="text-lg font-mono text-blue-400 mt-1">{timeLeft}</div>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/dashboard')}
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
