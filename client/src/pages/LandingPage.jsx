import React from 'react';
import { Link } from 'react-router-dom';
import { Code, Terminal, Zap } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex flex-col items-center justify-center gap-1">
                    <img src="/logo.png" alt="The Coding Club" className="w-12 h-12 object-contain animate-gentle-bounce" />
                    <span className="font-bold text-xs tracking-widest text-white leading-none uppercase">
                        The Coding Club
                    </span>
                </div>
                <div className="flex gap-4">
                    <Link to="/login" className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:text-white transition">Login</Link>
                    <Link to="/signup" className="px-4 py-2 bg-[#35588E] hover:bg-blue-600 rounded-lg font-medium shadow-lg shadow-blue-500/30 transition">Join Now</Link>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-8">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Daily Coding Challenges</span>
                </div>
                <h1 className="text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                    Code Daily. Build Consistency.<br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Forge Your Future.</span>
                </h1>
                <p className="text-xl text-slate-400 mb-10 max-w-2xl">
                    Join CodeForge to build your daily coding habit. Solve one problem every day, maintain your streak, and level up your skills.
                </p>
                <Link to="/signup" className="px-8 py-4 bg-[#35588E] hover:bg-blue-600 text-lg rounded-xl font-bold shadow-xl shadow-blue-500/30 transition hover:-translate-y-1">
                    Start Your Journey
                </Link>
            </main>
        </div>
    );
}
