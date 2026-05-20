import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

export default function AdminAddMCQ() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [day, setDay] = useState('');
    const [title, setTitle] = useState('');
    const [unlockDate, setUnlockDate] = useState('');
    const [questions, setQuestions] = useState([
        { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, explanation: '' }
    ]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isEditing) {
            // Fetch existing
            const fetchMCQ = async () => {
                try {
                    const token = localStorage.getItem('token');
                    // Need a dedicated get by ID route, or just get all and find
                    const res = await axios.get('/api/mcqs', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const mcq = res.data.find(m => m._id === id);
                    if (mcq) {
                        setDay(mcq.day);
                        setTitle(mcq.title);
                        setUnlockDate(new Date(mcq.unlockDate).toISOString().split('T')[0]);
                        setQuestions(mcq.questions);
                    }
                } catch (error) {
                    console.error("Error fetching MCQ", error);
                }
            };
            fetchMCQ();
        }
    }, [id, isEditing]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, explanation: '' }]);
    };

    const handleRemoveQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index, field, value) => {
        const newQ = [...questions];
        newQ[index][field] = value;
        setQuestions(newQ);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQ = [...questions];
        newQ[qIndex].options[oIndex] = value;
        setQuestions(newQ);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                day: parseInt(day),
                title,
                unlockDate,
                questions
            };
            
            if (isEditing) {
                // Assuming we have a PUT route
                await axios.put(`/api/mcqs/${id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/mcqs', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            navigate('/admin');
        } catch (error) {
            alert('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
                <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                
                <div className="glass-card p-8 border border-slate-700/50">
                    <h2 className="text-2xl font-bold text-white mb-8">{isEditing ? 'Edit MCQ Challenge' : 'Create Daily MCQ Challenge'}</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Day Number</label>
                                <input type="number" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={day} onChange={e => setDay(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-slate-400 text-sm mb-2">Title</label>
                                <input type="text" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. JavaScript Basics" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Unlock Date</label>
                            <input type="date" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                value={unlockDate} onChange={e => setUnlockDate(e.target.value)} />
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Questions</h3>
                                <button type="button" onClick={handleAddQuestion} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition">
                                    <Plus className="w-4 h-4" /> Add Question
                                </button>
                            </div>

                            <div className="space-y-8">
                                {questions.map((q, qIndex) => (
                                    <div key={qIndex} className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="text-white font-medium">Question {qIndex + 1}</h4>
                                            {questions.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="text-red-400 hover:text-red-300 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-slate-400 text-sm mb-2">Question Text</label>
                                                <textarea required rows="2" className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                                    value={q.questionText} onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)} />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex items-center gap-3">
                                                        <input type="radio" name={`correct-${qIndex}`} 
                                                            checked={q.correctOptionIndex === oIndex}
                                                            onChange={() => updateQuestion(qIndex, 'correctOptionIndex', oIndex)}
                                                            className="w-4 h-4 text-purple-500"
                                                        />
                                                        <input type="text" required placeholder={`Option ${oIndex + 1}`}
                                                            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                                            value={opt} onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-slate-400 text-sm mb-2">Explanation (Shown after submission)</label>
                                                <textarea required rows="2" className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                                    value={q.explanation} onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-slate-800">
                            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition shadow-lg shadow-purple-500/20 disabled:opacity-50">
                                <Save className="w-5 h-5" /> {isEditing ? 'Update MCQ' : 'Create MCQ'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
