import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            let token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await axios.get('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUser(res.data);
                } catch (error) {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const res = await axios.post('/api/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        
        try {
            const meRes = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${res.data.token}` }
            });
            setUser(meRes.data);
            if (meRes.data.name) localStorage.setItem('userName', meRes.data.name);
        } catch (error) {
            setUser(res.data); // Fallback to partial user if fetch fails
            if (res.data.name) localStorage.setItem('userName', res.data.name);
        }
    };

    const register = async (name, email, password) => {
        const res = await axios.post('/api/auth/register', { name, email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userName', name);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
