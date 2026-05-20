import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ArrowLeft, Plus, Trash2, Save, Edit3 } from 'lucide-react';

export default function AdminAddProblem() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [errorMsg, setErrorMsg] = useState('');
    
    const [problem, setProblem] = useState({
        day: '',
        title: '',
        difficulty: 'easy',
        description: '',
        timeLimit: 2000,
        memoryLimit: 256,
        unlockDate: '',
    });

    const [constraints, setConstraints] = useState(['']);
    
    const [examples, setExamples] = useState([
        { input: '', output: '', explanation: '' }
    ]);
    
    const [testCases, setTestCases] = useState([
        { input: '', output: '', hidden: false }
    ]);

    const [hiddenTestCases, setHiddenTestCases] = useState([
        { input: '', output: '' }
    ]);

    const [starterCode, setStarterCode] = useState({
        javascript: '// Write your javascript code here\n',
        python: '# Write your python code here\n',
        java: '// Write your java code here\n',
        cpp: '// Write your c++ code here\n'
    });
    
    const [activeCodeTab, setActiveCodeTab] = useState('javascript');

    const handleAddConstraint = () => setConstraints([...constraints, '']);
    const handleRemoveConstraint = (index) => setConstraints(constraints.filter((_, i) => i !== index));
    const handleConstraintChange = (index, value) => {
        const newC = [...constraints];
        newC[index] = value;
        setConstraints(newC);
    };

    useEffect(() => {
        if (isEditMode) {
            const fetchProblem = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`/api/problems/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    const p = res.data;
                    setProblem({
                        day: p.day || '',
                        title: p.title || '',
                        difficulty: p.difficulty || 'easy',
                        description: p.description || '',
                        timeLimit: p.timeLimit || 2000,
                        memoryLimit: p.memoryLimit || 256,
                        unlockDate: p.unlockDate ? p.unlockDate.split('T')[0] : '',
                    });
                    
                    if (p.constraints && p.constraints.length > 0) setConstraints(p.constraints);
                    if (p.examples && p.examples.length > 0) setExamples(p.examples);
                    if (p.testCases && p.testCases.length > 0) setTestCases(p.testCases);
                    if (p.hiddenTestCases && p.hiddenTestCases.length > 0) setHiddenTestCases(p.hiddenTestCases);
                    if (p.starterCode) setStarterCode(p.starterCode);
                    
                } catch (error) {
                    setErrorMsg('Failed to fetch problem data');
                    console.error(error);
                } finally {
                    setPageLoading(false);
                }
            };
            fetchProblem();
        }
    }, [id, isEditMode]);

    const handleAddExample = () => setExamples([...examples, { input: '', output: '', explanation: '' }]);
    const handleRemoveExample = (index) => setExamples(examples.filter((_, i) => i !== index));

    const handleAddTestCase = () => setTestCases([...testCases, { input: '', output: '', hidden: false }]);
    const handleRemoveTestCase = (index) => setTestCases(testCases.filter((_, i) => i !== index));

    const handleAddHiddenTestCase = () => setHiddenTestCases([...hiddenTestCases, { input: '', output: '' }]);
    const handleRemoveHiddenTestCase = (index) => setHiddenTestCases(hiddenTestCases.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            
            // Filter out completely empty arrays to avoid DB clutter
            const cleanConstraints = constraints.filter(c => c.trim() !== '');
            const cleanExamples = examples.filter(ex => ex.input.trim() || ex.output.trim());
            const cleanTestCases = testCases.filter(tc => tc.input.trim() || tc.output.trim());
            const cleanHiddenTestCases = hiddenTestCases.filter(htc => htc.input.trim() || htc.output.trim());

            const payload = {
                ...problem,
                constraints: cleanConstraints,
                examples: cleanExamples,
                testCases: cleanTestCases,
                hiddenTestCases: cleanHiddenTestCases,
                starterCode
            };

            if (isEditMode) {
                await axios.put(`/api/admin/problems/${id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/admin/problems', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            navigate('/admin');
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) return <div className="min-h-screen text-white flex items-center justify-center">Loading problem data...</div>;

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        {isEditMode ? <Edit3 className="w-8 h-8 text-blue-400" /> : <Plus className="w-8 h-8 text-blue-400" />}
                        {isEditMode ? 'Edit Problem' : 'Problem Builder'}
                    </h1>
                </div>

                {errorMsg && (
                    <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-6 border border-red-500/50">
                        <span className="font-bold">Error saving problem:</span> {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Basic Info Section */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <h2 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2">Basic Info</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Title</label>
                                <input type="text" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                    value={problem.title} onChange={e => setProblem({...problem, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Day Number</label>
                                <input type="number" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                    value={problem.day} onChange={e => setProblem({...problem, day: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Difficulty</label>
                                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                    value={problem.difficulty} onChange={e => setProblem({...problem, difficulty: e.target.value})}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Unlock Date</label>
                                <input type="date" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                    value={problem.unlockDate} onChange={e => setProblem({...problem, unlockDate: e.target.value})} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm text-slate-300 mb-1">Description (Markdown)</label>
                            <textarea required rows="5" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                value={problem.description} onChange={e => setProblem({...problem, description: e.target.value})}></textarea>
                        </div>
                    </div>

                    {/* Execution Limits */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <h2 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2">Execution Limits</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Time Limit (ms)</label>
                                <input type="number" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                    value={problem.timeLimit} onChange={e => setProblem({...problem, timeLimit: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Memory Limit (MB)</label>
                                <input type="number" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none" 
                                    value={problem.memoryLimit} onChange={e => setProblem({...problem, memoryLimit: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Constraints */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                            <h2 className="text-xl font-semibold text-white">Constraints</h2>
                            <button type="button" onClick={handleAddConstraint} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Constraint</button>
                        </div>
                        {constraints.map((c, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white outline-none" 
                                    value={c} onChange={e => handleConstraintChange(i, e.target.value)} placeholder={`e.g. 1 <= nums.length <= 10^4`} />
                                <button type="button" onClick={() => handleRemoveConstraint(i)} className="p-2 text-red-400 hover:bg-red-500/20 rounded"><Trash2 className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>

                    {/* Starter Code */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <h2 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2">Starter Code</h2>
                        <div className="flex gap-2 mb-4">
                            {Object.keys(starterCode).map(lang => (
                                <button key={lang} type="button" onClick={() => setActiveCodeTab(lang)} 
                                    className={`px-4 py-2 text-sm rounded ${activeCodeTab === lang ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <textarea rows="6" className="w-full p-4 bg-[#1e1e1e] border border-slate-700 rounded text-slate-300 font-mono text-sm outline-none"
                            value={starterCode[activeCodeTab]} 
                            onChange={e => setStarterCode({...starterCode, [activeCodeTab]: e.target.value})}></textarea>
                    </div>

                    {/* Visible Test Cases */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                            <h2 className="text-xl font-semibold text-white">Visible Test Cases</h2>
                            <button type="button" onClick={handleAddTestCase} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Test Case</button>
                        </div>
                        {testCases.map((tc, i) => (
                            <div key={i} className="bg-slate-800/50 p-4 rounded mb-4 border border-slate-700">
                                <div className="flex justify-between mb-2">
                                    <span className="text-slate-400 font-medium text-sm">Test Case {i+1}</span>
                                    <button type="button" onClick={() => handleRemoveTestCase(i)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Input</label>
                                        <textarea rows="2" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm outline-none" 
                                            value={tc.input} onChange={e => { const newTc = [...testCases]; newTc[i].input = e.target.value; setTestCases(newTc); }} placeholder="nums = [2,7,11,15]\ntarget = 9"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Expected Output</label>
                                        <textarea rows="2" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm outline-none" 
                                            value={tc.output} onChange={e => { const newTc = [...testCases]; newTc[i].output = e.target.value; setTestCases(newTc); }} placeholder="[0,1]"></textarea>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Hidden Test Cases */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                            <h2 className="text-xl font-semibold text-white">Evaluation Test Cases (Hidden)</h2>
                            <button type="button" onClick={handleAddHiddenTestCase} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Hidden Test Case</button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">These test cases are used by the Online Judge but are not shown to the user.</p>
                        {hiddenTestCases.map((tc, i) => (
                            <div key={i} className="bg-slate-800/50 p-4 rounded mb-4 border border-slate-700">
                                <div className="flex justify-between mb-2">
                                    <span className="text-slate-400 font-medium text-sm">Hidden Case {i+1}</span>
                                    <button type="button" onClick={() => handleRemoveHiddenTestCase(i)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Input</label>
                                        <textarea rows="2" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm outline-none" 
                                            value={tc.input} onChange={e => { const newTc = [...hiddenTestCases]; newTc[i].input = e.target.value; setHiddenTestCases(newTc); }}></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Expected Output</label>
                                        <textarea rows="2" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm outline-none" 
                                            value={tc.output} onChange={e => { const newTc = [...hiddenTestCases]; newTc[i].output = e.target.value; setHiddenTestCases(newTc); }}></textarea>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-4 pb-12">
                        <button type="button" onClick={() => navigate('/admin')} className="px-6 py-3 text-slate-300 hover:text-white transition font-medium">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-3 bg-[#35588E] hover:bg-blue-600 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30 transition flex items-center gap-2">
                            <Save className="w-5 h-5"/> {loading ? 'Saving...' : isEditMode ? 'Update Problem' : 'Publish Problem'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
