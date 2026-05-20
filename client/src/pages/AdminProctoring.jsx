import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, User, MoreVertical, XCircle, MessageSquare, Zap, Activity, Video } from 'lucide-react';

export default function AdminProctoring() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ active: 0, highRisk: 0, violations: 0 });
    
    const socketRef = useRef(null);

    useEffect(() => {
        initSocket();
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const initSocket = () => {
        const token = localStorage.getItem('token');
        const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
        socketRef.current = io(socketUrl, {
            auth: { token }
        });

        socketRef.current.on('initial_active_candidates', (data) => {
            setCandidates(data);
            setLoading(false);
            updateStats(data);
        });

        socketRef.current.on('candidate_joined', (data) => {
            setCandidates(prev => {
                const exists = prev.find(c => c.candidate._id === data.candidate._id);
                if (exists) return prev;
                const newList = [...prev, { ...data, integrityScore: 100, violations: [], riskScore: 0 }];
                updateStats(newList);
                return newList;
            });
        });

        socketRef.current.on('candidate_update', (data) => {
            // data: { candidateId, faceStatus, integrityScore, currentQuestion }
            setCandidates(prev => prev.map(c => {
                if (c.candidate._id === data.candidateId) {
                    return { ...c, ...data };
                }
                return c;
            }));
        });

        socketRef.current.on('candidate_stream', (data) => {
            // data: { candidateId, frame }
            setCandidates(prev => prev.map(c => {
                if (c.candidate._id === data.candidateId) {
                    return { ...c, currentFrame: data.frame };
                }
                return c;
            }));
        });

        socketRef.current.on('violation_alert', (data) => {
            // data: { candidateId, candidateName, integrityScore, violation }
            setCandidates(prev => {
                const newList = prev.map(c => {
                    if (c.candidate._id === data.candidateId) {
                        return { 
                            ...c, 
                            integrityScore: data.integrityScore, 
                            violations: [data.violation, ...(c.violations || [])] 
                        };
                    }
                    return c;
                });
                updateStats(newList);
                return newList;
            });
        });

        socketRef.current.on('candidate_left', (data) => {
            setCandidates(prev => {
                const newList = prev.filter(c => c.candidate._id !== data.candidateId);
                updateStats(newList);
                return newList;
            });
        });
    };

    const updateStats = (list) => {
        const active = list.length;
        const highRisk = list.filter(c => c.integrityScore < 50).length;
        const totalViolations = list.reduce((acc, c) => acc + (c.violations?.length || 0), 0);
        setStats({ active, highRisk, violations: totalViolations });
    };

    const handleAction = (candidateId, action) => {
        if (socketRef.current) {
            socketRef.current.emit('admin_action', { candidateId, action });
            if (action === 'disqualify') {
                alert(`Candidate disqualified.`);
            } else if (action === 'warn') {
                alert(`Warning sent to candidate.`);
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium">Connecting to Proctoring Server...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
            <Navbar />
            
            <main className="flex-1 p-6 lg:p-10">
                <div className="max-w-7xl mx-auto">
                    {/* Header & Stats */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <Video className="w-8 h-8 text-red-500" />
                                Live Proctoring Center
                            </h1>
                            <p className="text-slate-400 mt-1">Real-time AI monitoring and academic integrity enforcement.</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-xl">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active</span>
                                    <span className="text-xl font-black text-white">{stats.active}</span>
                                </div>
                                <div className="w-px h-8 bg-slate-800"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High Risk</span>
                                    <span className={`text-xl font-black ${stats.highRisk > 0 ? 'text-red-500' : 'text-green-500'}`}>{stats.highRisk}</span>
                                </div>
                                <div className="w-px h-8 bg-slate-800"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Violations</span>
                                    <span className="text-xl font-black text-yellow-500">{stats.violations}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Candidates Grid */}
                    {candidates.length === 0 ? (
                        <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center">
                            <Activity className="w-16 h-16 text-slate-700 mb-6 animate-pulse" />
                            <h2 className="text-2xl font-bold text-slate-400">Waiting for candidates to join...</h2>
                            <p className="text-slate-600 mt-2">The live proctoring grid will automatically populate once an exam begins.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {candidates.map(c => (
                                <div key={c.candidate._id} className={`group bg-slate-900 border-2 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl
                                    ${c.integrityScore < 40 ? 'border-red-500/50 shadow-red-500/10' : 
                                      c.integrityScore < 70 ? 'border-yellow-500/50 shadow-yellow-500/10' : 'border-slate-800 hover:border-blue-500/50 shadow-blue-500/5'}`}>
                                    
                                    {/* Video Stream Placeholder */}
                                    <div className="relative aspect-video bg-black overflow-hidden">
                                        {c.currentFrame ? (
                                            <img src={c.currentFrame} alt="Candidate Live Stream" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                                                <div className="w-10 h-10 border-2 border-slate-800 border-t-slate-600 rounded-full animate-spin mb-2"></div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for stream...</span>
                                            </div>
                                        )}
                                        
                                        {/* Overlay Badges */}
                                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                                            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-tighter border border-white/10 flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${c.currentFrame ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                                                Live
                                            </div>
                                            <div className={`px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-tighter border border-white/10
                                                ${c.faceStatus === 'Good' ? 'bg-green-500/40' : 'bg-red-500/40'}`}>
                                                {c.faceStatus || 'Initializing'}
                                            </div>
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md border border-white/10 shadow-lg
                                                ${c.integrityScore > 70 ? 'bg-green-500/20 text-green-400' : 
                                                  c.integrityScore > 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                <span className="text-xs font-black leading-none">{c.integrityScore}</span>
                                                <span className="text-[8px] font-bold uppercase">Score</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Candidate Info */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-white truncate max-w-[150px]">{c.candidate.name}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{c.candidate.email}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleAction(c.candidate._id, 'warn')} className="p-2 bg-slate-800 hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-500 rounded-xl transition shadow-sm" title="Send Warning">
                                                    <Zap className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleAction(c.candidate._id, 'disqualify')} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-xl transition shadow-sm" title="Disqualify">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                <span>Recent Violations</span>
                                                <span className="text-slate-300">{c.violations?.length || 0} Total</span>
                                            </div>
                                            <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-none">
                                                {c.violations?.slice(0, 3).map((v, i) => (
                                                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/30 text-[10px] text-slate-400">
                                                        <AlertTriangle className="w-3 h-3 text-red-500" />
                                                        <span className="font-bold text-slate-300">{v.type}:</span>
                                                        <span className="truncate">{new Date(v.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                ))}
                                                {(!c.violations || c.violations.length === 0) && (
                                                    <div className="py-2 text-center text-slate-600 text-[10px] font-medium border-2 border-dashed border-slate-800 rounded-xl">
                                                        No violations recorded yet.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar Footer */}
                                    <div className="h-1.5 w-full bg-slate-800">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${c.integrityScore > 70 ? 'bg-green-500' : c.integrityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                            style={{ width: `${c.integrityScore}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
