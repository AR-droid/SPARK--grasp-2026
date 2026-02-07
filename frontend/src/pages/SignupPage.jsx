import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const SignupPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/register', { email, password });
            if (res.data?.token) {
                localStorage.setItem('dev_token', res.data.token);
            }
            setLoading(false);
            navigate('/projects');
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.error || 'Signup failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <div className="box max-w-md w-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-black"></div>
                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-blue-600 border-2 border-black"></div>

                <div className="text-center mb-8 border-b-4 border-black pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-widest">Enroll</h2>
                    <p className="font-mono text-sm mt-1 text-gray-600">Create Operator Access</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Operator ID / Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border-2 border-black p-3 font-mono focus:outline-none focus:bg-yellow-50"
                            placeholder="operator@spark.ai"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Passcode</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border-2 border-black p-3 font-mono focus:outline-none focus:bg-yellow-50"
                            placeholder="min 6 chars"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-gray-800 transition-transform active:scale-[0.98]"
                    >
                        {loading ? 'Creating...' : 'Create Account →'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 text-red-600 text-sm font-mono">{error}</div>
                )}

                <div className="mt-6 text-xs font-bold uppercase text-gray-500 font-mono text-center">
                    Already have access? <a className="underline" href="/login">Login</a>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
