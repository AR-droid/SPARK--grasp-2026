import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const useDevAuth = import.meta.env.VITE_USE_DEV_AUTH === 'true';
        if (useDevAuth) {
            const token = localStorage.getItem('dev_token');
            setSession(token ? { user: { email: 'dev' } } : null);
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        return () => {
            listener?.subscription?.unsubscribe();
        };
    }, []);

    const value = { session, loading };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
