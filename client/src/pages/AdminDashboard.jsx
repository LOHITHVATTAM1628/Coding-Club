import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { Users, FileCode, Activity, Plus, Trash2, Pencil, DownloadCloud } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [problems, setProblems] = useState([]);
    const [mcqs, setMcqs] = useState([]);
    const [sqls, setSqls] = useState([]);
    const [resources, setResources] = useState([]);
    const [mockTests, setMockTests] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('problems');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchEmail, setSearchEmail] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [newProblem, setNewProblem] = useState({
        day: '', title: '', difficulty: 'easy', description: '', hiddenSolution: '', unlockDate: ''
    });
    const [newResource, setNewResource] = useState({
        title: '', description: '', url: '', category: 'Coding', company: '', difficulty: 'Easy'
    });

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const [analyticsRes, problemsRes, usersRes, mcqsRes, sqlsRes, resourcesRes, mocksRes] = await Promise.all([
                axios.get('/api/admin/analytics', config),
                axios.get('/api/problems', config),
                axios.get('/api/admin/users', config),
                axios.get('/api/mcqs', config).catch(() => ({ data: [] })),
                axios.get('/api/sql', config).catch(() => ({ data: [] })),
                axios.get('/api/resources', config).catch(() => ({ data: [] })),
                axios.get('/api/mock-tests/admin', config).catch(() => ({ data: [] }))
            ]);
            
            setAnalytics(analyticsRes.data);
            setProblems(problemsRes.data);
            setUsersList(usersRes.data);
            setMcqs(mcqsRes.data || []);
            setSqls(sqlsRes.data || []);
            setResources(resourcesRes.data || []);
            setMockTests(mocksRes.data || []);
        } catch (error) {
            console.error("Error fetching admin data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateProblem = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/problems', {
                ...newProblem,
                day: parseInt(newProblem.day),
                starterCode: { javascript: '// Write javascript here', python: '# Write python here', java: '// Write java here', cpp: '// Write c++ here' },
                examples: [],
                constraints: []
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Failed to create problem: ' + error.response?.data?.message || error.message);
        }
    };

    const handleDeleteProblem = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/problems/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchData();
            alert('Problem deleted successfully');
        } catch (error) {
            console.error("Error deleting problem", error);
            alert('Failed to delete problem: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteMCQ = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/mcqs/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchData();
            alert('MCQ deleted successfully');
        } catch (error) {
            console.error("Error deleting MCQ", error);
            alert('Failed to delete MCQ: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteSQL = async (id) => {
        if (!id) {
            alert("Error: SQL Lab ID is missing.");
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`/api/sql/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.status === 200) {
                await fetchData();
                alert('SQL Lab deleted successfully');
            } else {
                alert('Failed to delete SQL Lab. Status: ' + res.status);
            }
        } catch (error) {
            console.error("Error deleting SQL", error);
            alert('Failed to delete SQL: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleCreateResource = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/resources', newResource, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowResourceModal(false);
            setNewResource({ title: '', description: '', url: '', category: 'Coding', company: '', difficulty: 'Easy' });
            fetchData();
        } catch (error) {
            alert('Failed to create resource: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteResource = async (id) => {
        if (!window.confirm('Delete this resource?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/resources/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchData();
            alert('Resource deleted successfully');
        } catch (error) {
            console.error("Error deleting resource", error);
            alert('Failed to delete resource: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleUpdateStatus = async (userId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/users/${userId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData(); // refresh list
        } catch (error) {
            alert('Failed to update status: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredUsers = usersList.filter(u => {
        if (statusFilter !== 'all' && u.status !== statusFilter) return false;
        if (searchEmail && !u.email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
        return true;
    });

    const handleDownloadReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/export', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'codeforge_report.xlsx');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            alert('Failed to download report');
            console.error(error);
        }
    };

    if (loading) return <div className="min-h-screen text-white flex items-center justify-center">Loading admin panel...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Platform Analytics</h2>
                    <button onClick={handleDownloadReport} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-green-500/20">
                        <DownloadCloud className="w-5 h-5" /> Download Report
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="glass-card p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-full"><Users className="w-8 h-8 text-blue-400" /></div>
                        <div>
                            <div className="text-3xl font-bold text-white">{analytics?.totalUsers}</div>
                            <div className="text-sm text-slate-400">Total Members</div>
                        </div>
                    </div>
                    <div className="glass-card p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-full"><FileCode className="w-8 h-8 text-purple-400" /></div>
                        <div>
                            <div className="text-3xl font-bold text-white">{analytics?.totalProblems}</div>
                            <div className="text-sm text-slate-400">Total Database Content</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {analytics?.totalCoding || 0} Code • {analytics?.totalMCQs || 0} MCQ • {analytics?.totalSQLs || 0} SQL
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-full"><Activity className="w-8 h-8 text-green-400" /></div>
                        <div>
                            <div className="text-3xl font-bold text-white">{analytics?.activeToday}</div>
                            <div className="text-sm text-slate-400">Active Users Today</div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard and Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Top 5 Leaderboard */}
                    <div className="glass-card p-6 border border-slate-700/50">
                        <h3 className="text-xl font-bold text-white mb-6">Top Performers</h3>
                        <div className="space-y-4">
                            {analytics?.leaderboard?.map((user, idx) => (
                                <div key={user._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
                                            ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                              idx === 1 ? 'bg-slate-400/20 text-slate-300' : 
                                              idx === 2 ? 'bg-amber-600/20 text-amber-500' : 'bg-slate-700 text-slate-400'}`}>
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">{user.name}</div>
                                            <div className="text-xs text-slate-400">Streak: {user.currentStreak} 🔥</div>
                                        </div>
                                    </div>
                                    <div className="text-blue-400 font-bold">{user.points} pts</div>
                                </div>
                            ))}
                            {(!analytics?.leaderboard || analytics.leaderboard.length === 0) && (
                                <div className="text-slate-500 text-center py-4">No users found</div>
                            )}
                        </div>
                    </div>

                    {/* Submissions Trend Chart */}
                    <div className="glass-card p-6 lg:col-span-2 border border-slate-700/50">
                        <h3 className="text-xl font-bold text-white mb-6">7-Day Coding Submissions</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics?.dailyChartData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="solved" stroke="#22c55e" strokeWidth={3} name="Solved" />
                                    <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={3} name="Failed" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-700 mb-6 overflow-x-auto whitespace-nowrap">
                    <button onClick={() => setActiveTab('problems')} className={`pb-2 font-medium transition ${activeTab === 'problems' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>Coding Problems</button>
                    <button onClick={() => setActiveTab('mcqs')} className={`pb-2 font-medium transition ${activeTab === 'mcqs' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>MCQs</button>
                    <button onClick={() => setActiveTab('sqls')} className={`pb-2 font-medium transition ${activeTab === 'sqls' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>SQL Labs</button>
                    <button onClick={() => setActiveTab('mocks')} className={`pb-2 font-medium transition ${activeTab === 'mocks' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>Mock Tests</button>
                    <button onClick={() => setActiveTab('resources')} className={`pb-2 font-medium transition ${activeTab === 'resources' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>Resources Hub</button>
                    <button onClick={() => setActiveTab('users')} className={`pb-2 font-medium transition ${activeTab === 'users' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>User Approvals</button>
                </div>

                {activeTab === 'mocks' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Mock Tests Builder</h2>
                            <button onClick={() => navigate('/admin/mock-tests/new')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-indigo-500/30">
                                <Plus className="w-4 h-4" /> Create Mock Test
                            </button>
                        </div>
                        
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="p-4 text-slate-300 font-semibold">Title</th>
                                        <th className="p-4 text-slate-300 font-semibold">Date & Time</th>
                                        <th className="p-4 text-slate-300 font-semibold">Duration</th>
                                        <th className="p-4 text-slate-300 font-semibold">Status</th>
                                        <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockTests.map(m => (
                                        <tr key={m._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-medium text-white">{m.title}</td>
                                            <td className="p-4 text-slate-300">{new Date(m.scheduledDate).toLocaleDateString()} at {m.startTime}</td>
                                            <td className="p-4 text-slate-300">{m.durationMinutes} mins</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs uppercase
                                                    ${m.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                                                      m.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                    {m.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => navigate(`/admin/mock-tests/edit/${m._id}`)} className="text-blue-400 hover:text-blue-300 p-2 transition">
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {mockTests.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No mock tests found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : activeTab === 'problems' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Problem Management</h2>
                            <button onClick={() => navigate('/admin/problems/new')} className="flex items-center gap-2 bg-[#35588E] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-500/30">
                                <Plus className="w-4 h-4" /> Add Problem
                            </button>
                        </div>
                        
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="p-4 text-slate-300 font-semibold">Day</th>
                                        <th className="p-4 text-slate-300 font-semibold">Title</th>
                                        <th className="p-4 text-slate-300 font-semibold">Difficulty</th>
                                        <th className="p-4 text-slate-300 font-semibold">Unlock Date</th>
                                        <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {problems.map(p => (
                                        <tr key={p._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 text-slate-300">{p.day}</td>
                                            <td className="p-4 font-medium text-white">{p.title}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs
                                                    ${p.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 
                                                      p.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {p.difficulty}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 text-sm">{new Date(p.unlockDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => navigate(`/admin/problems/edit/${p._id}`)} className="text-blue-400 hover:text-blue-300 p-2 transition">
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteProblem(p._id)} className="text-red-400 hover:text-red-300 p-2 transition">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {problems.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No problems found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : activeTab === 'mcqs' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">MCQ Management</h2>
                            <button onClick={() => navigate('/admin/mcqs/new')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-purple-500/30">
                                <Plus className="w-4 h-4" /> Add MCQ
                            </button>
                        </div>
                        
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="p-4 text-slate-300 font-semibold">Day</th>
                                        <th className="p-4 text-slate-300 font-semibold">Title</th>
                                        <th className="p-4 text-slate-300 font-semibold">Questions</th>
                                        <th className="p-4 text-slate-300 font-semibold">Unlock Date</th>
                                        <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mcqs.map(m => (
                                        <tr key={m._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 text-slate-300">{m.day}</td>
                                            <td className="p-4 font-medium text-white">{m.title}</td>
                                            <td className="p-4 text-slate-300">{m.questions?.length || 0}</td>
                                            <td className="p-4 text-slate-400 text-sm">{new Date(m.unlockDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => navigate(`/admin/mcqs/edit/${m._id}`)} className="text-blue-400 hover:text-blue-300 p-2 transition">
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteMCQ(m._id)} className="text-red-400 hover:text-red-300 p-2 transition">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {mcqs.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No MCQs found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : activeTab === 'sqls' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">SQL Management</h2>
                            <button onClick={() => navigate('/admin/sqls/new')} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-orange-500/30">
                                <Plus className="w-4 h-4" /> Add SQL
                            </button>
                        </div>
                        
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="p-4 text-slate-300 font-semibold">Day</th>
                                        <th className="p-4 text-slate-300 font-semibold">Title</th>
                                        <th className="p-4 text-slate-300 font-semibold">Difficulty</th>
                                        <th className="p-4 text-slate-300 font-semibold">Unlock Date</th>
                                        <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sqls.map(s => (
                                        <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 text-slate-300">{s.day}</td>
                                            <td className="p-4 font-medium text-white">{s.title}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs
                                                    ${s.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 
                                                      s.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {s.difficulty}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 text-sm">{new Date(s.unlockDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => navigate(`/admin/sqls/edit/${s._id}`)} className="text-blue-400 hover:text-blue-300 p-2 transition">
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteSQL(s._id)} className="text-red-400 hover:text-red-300 p-2 transition">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {sqls.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No SQL labs found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : activeTab === 'resources' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Resources Hub</h2>
                            <button onClick={() => setShowResourceModal(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-teal-500/30">
                                <Plus className="w-4 h-4" /> Add Resource
                            </button>
                        </div>
                        
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="p-4 text-slate-300 font-semibold">Title</th>
                                        <th className="p-4 text-slate-300 font-semibold">Category</th>
                                        <th className="p-4 text-slate-300 font-semibold">Company</th>
                                        <th className="p-4 text-slate-300 font-semibold">URL</th>
                                        <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resources.map(r => (
                                        <tr key={r._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-medium text-white">{r.title}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">{r.category}</span>
                                            </td>
                                            <td className="p-4 text-slate-400">{r.company || '-'}</td>
                                            <td className="p-4 text-slate-400 text-sm max-w-[200px] truncate">
                                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{r.url}</a>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => handleDeleteResource(r._id)} className="text-red-400 hover:text-red-300 p-2 transition">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {resources.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No resources found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-2xl font-bold text-white">User Approvals</h2>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Search email..." 
                                    className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                />
                                <select 
                                    className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700">
                                        <th className="p-4 text-slate-300 font-semibold">Name</th>
                                        <th className="p-4 text-slate-300 font-semibold">Email</th>
                                        <th className="p-4 text-slate-300 font-semibold">Status</th>
                                        <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => (
                                        <tr key={u._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-medium text-white">{u.name}</td>
                                            <td className="p-4 text-slate-300">{u.email}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold
                                                    ${u.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                                                      u.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {u.status?.toUpperCase() || 'UNKNOWN'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                {u.status !== 'active' && (
                                                    <button onClick={() => handleUpdateStatus(u._id, 'active')} className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-sm transition">
                                                        Approve
                                                    </button>
                                                )}
                                                {u.status !== 'blocked' && (
                                                    <button onClick={() => handleUpdateStatus(u._id, 'blocked')} className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition">
                                                        Reject
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-500">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </main>

            {/* Add Resource Modal */}
            {showResourceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full">
                        <h2 className="text-2xl font-bold text-white mb-6">Add New Resource</h2>
                        <form onSubmit={handleCreateResource} className="space-y-4">
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Title</label>
                                <input type="text" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Description</label>
                                <textarea required rows="2" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">External URL (or Drive Link)</label>
                                <input type="url" required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Category</label>
                                    <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                        value={newResource.category} onChange={e => setNewResource({...newResource, category: e.target.value})}
                                    >
                                        {['Coding', 'MCQ', 'SQL', 'Interview Prep', 'System Design', 'Aptitude', 'Roadmap'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Difficulty</label>
                                    <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                        value={newResource.difficulty} onChange={e => setNewResource({...newResource, difficulty: e.target.value})}
                                    >
                                        <option value="">None</option>
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Company (Optional)</label>
                                <input type="text" placeholder="e.g. Google, Amazon" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    value={newResource.company} onChange={e => setNewResource({...newResource, company: e.target.value})}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-4 mt-6">
                                <button type="button" onClick={() => setShowResourceModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition">Save Resource</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
