import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Code, LogOut, User as UserIcon, Globe, Video, Shield, Bell } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchNotifications = () => {
            if (user) {
                const ts = new Date().getTime();
                axios.get(`/api/mock-tests/notifications/me?t=${ts}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }).then(res => {
                    if (isMounted) setNotifications(res.data);
                }).catch(console.error);
            }
        };
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 15000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex flex-col items-center justify-center hover:opacity-80 transition gap-1">
                            <img src="/logo.png" alt="The Coding Club" className="w-10 h-10 object-contain animate-gentle-bounce" />
                            <span className="font-bold text-[10px] tracking-widest text-white leading-none uppercase">
                                The Coding Club
                            </span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-6">
                        {user?.role === 'admin' && (
                            <Link to="/admin/proctoring" className="flex items-center gap-2 text-slate-300 hover:text-red-400 transition font-medium">
                                <Video className="w-5 h-5 text-red-500" />
                                <span className="hidden sm:inline">Live Proctoring</span>
                            </Link>
                        )}
                        {user?.role === 'member' && (
                            <>
                                <Link to="/mock-exam" className="flex items-center gap-2 text-slate-300 hover:text-red-400 transition font-medium">
                                    <Shield className="w-5 h-5 text-red-500" />
                                    <span className="hidden sm:inline">Mock Exam</span>
                                </Link>
                                <Link to="/resources" className="flex items-center gap-2 text-slate-300 hover:text-blue-400 transition font-medium">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                    <span className="hidden sm:inline">Resources</span>
                                </Link>
                            </>
                        )}
                        <div className="relative flex items-center">
                            <button onClick={() => setShowNotifs(!showNotifs)} className="text-slate-400 hover:text-white transition relative p-2">
                                <Bell className="w-5 h-5" />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                )}
                            </button>
                            {showNotifs && (
                                <div className="absolute top-10 right-0 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
                                    <div className="p-3 bg-slate-800 border-b border-slate-700 text-white font-bold text-sm">Notifications</div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.map(n => (
                                            <div key={n._id} className="p-3 border-b border-slate-800/50 hover:bg-slate-800 transition text-sm">
                                                <div className="font-bold text-white">{n.title}</div>
                                                <div className="text-slate-400 text-xs">{n.message}</div>
                                                {n.link && <Link to={n.link} className="text-blue-400 text-xs hover:underline mt-1 block">View</Link>}
                                            </div>
                                        ))}
                                        {notifications.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">No notifications</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300 border-l border-slate-700 pl-6">
                            <UserIcon className="w-5 h-5" />
                            <span className="font-medium">{user?.name}</span>
                            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 uppercase tracking-wider">{user?.role}</span>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
