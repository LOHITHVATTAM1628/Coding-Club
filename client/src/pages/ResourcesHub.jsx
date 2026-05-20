import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { Globe, BookOpen, Database, HelpCircle, GraduationCap, Server, TrendingUp, Briefcase, ExternalLink, Sparkles } from 'lucide-react';

const CATEGORIES = ['All', 'Coding', 'MCQ', 'SQL', 'Interview Prep', 'System Design', 'Aptitude', 'Roadmap'];

const getCategoryIcon = (category) => {
    switch(category) {
        case 'Coding': return <BookOpen className="w-5 h-5 text-blue-400" />;
        case 'SQL': return <Database className="w-5 h-5 text-orange-400" />;
        case 'MCQ': return <HelpCircle className="w-5 h-5 text-purple-400" />;
        case 'Interview Prep': return <Briefcase className="w-5 h-5 text-green-400" />;
        case 'System Design': return <Server className="w-5 h-5 text-teal-400" />;
        case 'Aptitude': return <TrendingUp className="w-5 h-5 text-yellow-400" />;
        case 'Roadmap': return <GraduationCap className="w-5 h-5 text-pink-400" />;
        default: return <Globe className="w-5 h-5 text-slate-400" />;
    }
};

export default function ResourcesHub() {
    const { user } = useContext(AuthContext);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/resources', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResources(res.data);
            } catch (error) {
                console.error("Error fetching resources", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, []);

    // Smart Recommendations Logic
    const getRecommendations = () => {
        if (!user || resources.length === 0) return [];
        
        let recommendedCategory = 'Interview Prep'; // default fallback
        
        const totalSQLs = user.completedSQLs?.length || 0;
        const totalMCQs = user.completedMCQs?.length || 0;
        const totalCoding = user.completedProblems?.length || 0;
        
        // Very basic heuristic: Find their weakest area
        const minVal = Math.min(totalSQLs, totalMCQs, totalCoding);
        
        if (totalSQLs === minVal) {
            recommendedCategory = 'SQL';
        } else if (totalMCQs === minVal) {
            recommendedCategory = 'Aptitude';
        } else if (totalCoding === minVal) {
            recommendedCategory = 'Coding';
        }

        return resources.filter(r => r.category === recommendedCategory).slice(0, 3);
    };

    const recommended = getRecommendations();
    
    const filteredResources = activeTab === 'All' 
        ? resources 
        : resources.filter(r => r.category === activeTab);

    if (loading) return <div className="min-h-screen text-white flex items-center justify-center">Loading resources...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                
                <div className="flex items-center gap-3 mb-8">
                    <Globe className="w-8 h-8 text-blue-500" />
                    <h1 className="text-3xl font-bold text-white">Resources Hub</h1>
                </div>

                {/* Recommendations Section */}
                {recommended.length > 0 && activeTab === 'All' && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" /> Recommended For You
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommended.map(resource => (
                                <ResourceCard key={resource._id} resource={resource} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-8 custom-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition font-medium
                                ${activeTab === cat 
                                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Resource Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredResources.map(resource => (
                        <ResourceCard key={resource._id} resource={resource} />
                    ))}
                    {filteredResources.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 glass-card">
                            No resources found in this category.
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}

function ResourceCard({ resource }) {
    return (
        <div className="glass-card p-6 flex flex-col group hover:border-slate-600 transition duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition group-hover:bg-blue-500/10"></div>
            
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-2 bg-slate-800/50 rounded-lg">
                    {getCategoryIcon(resource.category)}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded">
                        {resource.category}
                    </span>
                    {resource.difficulty && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider
                            ${resource.difficulty === 'Easy' ? 'text-green-400' : 
                              resource.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {resource.difficulty}
                        </span>
                    )}
                </div>
            </div>
            
            {resource.company && (
                <div className="text-xs text-blue-400 font-bold tracking-wider uppercase mb-1">{resource.company}</div>
            )}
            
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{resource.title}</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-3">{resource.description}</p>
            
            <a 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-800 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 transition text-sm font-medium border border-slate-700 hover:border-blue-500"
            >
                Open Resource <ExternalLink className="w-4 h-4" />
            </a>
        </div>
    );
}
