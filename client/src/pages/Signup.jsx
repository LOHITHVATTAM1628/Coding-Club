import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Code } from 'lucide-react';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { register, login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.');
            return;
        }

        try {
            const res = await register(name, email, password);
            setSuccess('Registration successful! Your account is pending admin approval.');
            setError('');
            
            // Clear form
            setName('');
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
            setSuccess('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 shadow-2xl">
                <div className="flex flex-col items-center justify-center gap-2 mb-6">
                    <img src="/logo.png" alt="The Coding Club" className="w-16 h-16 object-contain animate-gentle-bounce" />
                    <span className="font-bold text-sm tracking-widest text-white leading-none uppercase">
                        The Coding Club
                    </span>
                </div>
                <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
                {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
                {success && <div className="bg-green-500/20 text-green-300 p-3 rounded mb-4 text-sm">{success}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Name</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500" 
                            value={name} onChange={(e) => setName(e.target.value)} required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Email</label>
                        <input 
                            type="email" 
                            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500" 
                            value={email} onChange={(e) => setEmail(e.target.value)} required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Password</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500" 
                            value={password} onChange={(e) => setPassword(e.target.value)} required 
                        />
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#35588E] hover:bg-blue-600 rounded-lg font-medium transition shadow-lg shadow-blue-500/30">
                        Sign Up
                    </button>
                </form>
                <div className="mt-6 text-center text-sm text-slate-400">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Login</Link>
                </div>
            </div>
        </div>
    );
}
