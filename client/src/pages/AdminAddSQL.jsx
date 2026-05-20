import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ArrowLeft, Save } from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function AdminAddSQL() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [day, setDay] = useState('');
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const [unlockDate, setUnlockDate] = useState('');
    const [description, setDescription] = useState('');
    const [initSQL, setInitSQL] = useState('-- Create tables and insert mock data\nCREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  salary INTEGER\n);\n\nINSERT INTO employees VALUES (1, "Alice", 50000);\nINSERT INTO employees VALUES (2, "Bob", 60000);\n');
    const [expectedOutput, setExpectedOutput] = useState('[\n  {"id":2,"name":"Bob","salary":60000}\n]');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isEditing) {
            const fetchSQL = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get('/api/sql', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const sqlProblem = res.data.find(s => s._id === id);
                    if (sqlProblem) {
                        setDay(sqlProblem.day);
                        setTitle(sqlProblem.title);
                        setDifficulty(sqlProblem.difficulty);
                        setUnlockDate(new Date(sqlProblem.unlockDate).toISOString().split('T')[0]);
                        setDescription(sqlProblem.description);
                        setInitSQL(sqlProblem.initSQL);
                        setExpectedOutput(sqlProblem.expectedOutput);
                    }
                } catch (error) {
                    console.error("Error fetching SQL problem", error);
                }
            };
            fetchSQL();
        }
    }, [id, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Validate expected Output is valid JSON
            try {
                JSON.parse(expectedOutput);
            } catch (err) {
                throw new Error("Expected Output must be valid JSON array of objects.");
            }

            const token = localStorage.getItem('token');
            const payload = {
                day: parseInt(day),
                title,
                difficulty,
                unlockDate,
                description,
                initSQL,
                expectedOutput
            };
            
            if (isEditing) {
                await axios.put(`/api/sql/${id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/sql', payload, {
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
            <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6">
                <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                
                <div className="glass-card p-8 border border-slate-700/50">
                    <h2 className="text-2xl font-bold text-white mb-8">{isEditing ? 'Edit SQL Lab' : 'Create Daily SQL Lab'}</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Day Number</label>
                                <input type="number" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={day} onChange={e => setDay(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-slate-400 text-sm mb-2">Title</label>
                                <input type="text" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Difficulty</label>
                                <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Unlock Date</label>
                            <input type="date" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                value={unlockDate} onChange={e => setUnlockDate(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Description / Task</label>
                            <textarea required rows="4" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                value={description} onChange={e => setDescription(e.target.value)} 
                                placeholder="e.g. Write a query to find all employees with salary > 50000." />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="h-96">
                                <label className="block text-slate-400 text-sm mb-2">Schema Init SQL</label>
                                <div className="h-full border border-slate-700 rounded-lg overflow-hidden">
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        language="sql"
                                        value={initSQL}
                                        onChange={(val) => setInitSQL(val)}
                                        options={{ minimap: { enabled: false } }}
                                    />
                                </div>
                            </div>
                            
                            <div className="h-96 flex flex-col">
                                <label className="block text-slate-400 text-sm mb-2">Expected Output (JSON Array of Objects)</label>
                                <div className="flex-1 border border-slate-700 rounded-lg overflow-hidden">
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        language="json"
                                        value={expectedOutput}
                                        onChange={(val) => setExpectedOutput(val)}
                                        options={{ minimap: { enabled: false } }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Example: <code className="bg-slate-800 px-1 py-0.5 rounded">[{'{"id": 1, "name": "Alice"}'}]</code>. The evaluated query output is stringified and compared against this JSON.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-slate-800">
                            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition shadow-lg shadow-orange-500/20 disabled:opacity-50">
                                <Save className="w-5 h-5" /> {isEditing ? 'Update SQL Lab' : 'Create SQL Lab'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
