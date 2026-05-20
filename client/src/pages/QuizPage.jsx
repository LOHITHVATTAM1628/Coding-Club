import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { HelpCircle, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuizPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    
    // Celebration state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [results, setResults] = useState(null);
    const [masterStreakUpdated, setMasterStreakUpdated] = useState(false);

    const isLocked = quiz && (!quiz.isToday || user?.completedMCQs?.includes(id));

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const token = localStorage.getItem('token');
                // For simplicity, we just fetch the today's quiz
                // In a robust system, you'd fetch by ID, but since read-only past quizzes
                // aren't fully implemented in the backend get endpoint, we just use /today.
                const res = await axios.get('/api/mcqs/today', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setQuiz(res.data);
                setAnswers(new Array(res.data.questions.length).fill(null));
            } catch (error) {
                console.error("Error fetching quiz", error);
                // If it fails, maybe navigate back
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id]);

    const handleSelectOption = (index) => {
        if (isLocked) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestion] = index;
        setAnswers(newAnswers);
    };

    const handleSubmit = async () => {
        if (!window.confirm("Are you sure you want to submit? You only get one attempt.")) return;
        
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/mcqs/submit', {
                mcqId: id,
                answers
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
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
                    colors: ['#a855f7', '#d946ef'] // purple/pink for quiz
                });
            }
            
            setShowSuccessModal(true);
            
        } catch (error) {
            alert('Error submitting quiz: ' + error.response?.data?.message || error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen text-white flex items-center justify-center">Loading quiz...</div>;
    if (!quiz) return <div className="min-h-screen text-white flex items-center justify-center">Quiz not found or not available today.</div>;

    const q = quiz.questions[currentQuestion];
    const isLast = currentQuestion === quiz.questions.length - 1;

    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            <Navbar />
            <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="flex items-center gap-2 text-purple-400 font-bold">
                        <HelpCircle className="w-5 h-5" /> Quiz Arena
                    </div>
                </div>

                {isLocked && !user?.completedMCQs?.includes(id) && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-center font-medium">
                        This quiz is read-only. Submissions are closed.
                    </div>
                )}
                
                {user?.completedMCQs?.includes(id) && !showSuccessModal ? (
                     <div className="flex-1 flex items-center justify-center">
                        <div className="text-center p-8 glass-card border border-green-500/30 max-w-md w-full">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-green-400 mb-2">✅ QUIZ COMPLETED</h2>
                            <p className="text-slate-400">You have already submitted today's quiz.</p>
                            <button onClick={() => navigate('/dashboard')} className="mt-6 px-6 py-2 bg-[#35588E] hover:bg-blue-600 text-white rounded-lg transition">Back to Dashboard</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="glass-card p-8 flex-1 flex flex-col">
                            <div className="flex justify-between text-sm text-slate-400 mb-6 font-medium">
                                <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
                                <span>Day {quiz.day}</span>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-8">{q.questionText}</h2>
                            
                            <div className="space-y-4 flex-1">
                                {q.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectOption(i)}
                                        disabled={isLocked}
                                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                                            ${answers[currentQuestion] === i 
                                                ? 'bg-purple-600/20 border-purple-500 text-purple-100' 
                                                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'}
                                            ${isLocked && 'opacity-50 cursor-not-allowed'}
                                        `}
                                    >
                                        <span className="inline-block w-6 text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                                <button
                                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                                    disabled={currentQuestion === 0}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                
                                {isLast ? (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isLocked || submitting}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-500/20"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Quiz'} <Check className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-2"
                                    >
                                        Next <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                            {masterStreakUpdated ? "DAILY PACK COMPLETE!" : "Quiz Completed!"}
                        </h2>
                        <p className="text-slate-400 mb-6">
                            {masterStreakUpdated 
                                ? "You've conquered Coding, Quiz, and SQL for today!" 
                                : `You scored ${results?.score} out of ${results?.total} (+20 pts)`}
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
