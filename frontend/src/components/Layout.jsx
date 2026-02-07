import React from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const inRouter = useInRouterContext();
    const location = inRouter ? useLocation() : { pathname: '/' };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Heavy Industrial Navbar */}
            <nav className="border-b-4 border-black p-4 flex justify-between items-center bg-white sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-2xl font-black tracking-tighter uppercase border-2 border-black p-1 bg-yellow-400">
                        SPARK_AI
                    </Link>
                    <span className="font-bold text-sm hidden md:block">
                        SAFETY // PREDICTION // ACCOUNTABILITY
                    </span>
                </div>

                <div className="flex gap-4">
                    {location.pathname !== '/dashboard' && location.pathname !== '/login' && (
                        <Link to="/login">
                            <button className="px-6 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700">
                                Launch_Console
                            </button>
                        </Link>
                    )}
                    <div className="border-2 border-black px-2 py-1 font-mono text-sm">
                        STATUS: ONLINE
                    </div>
                </div>
            </nav>

            <main className="flex-grow bg-slate-50">
                {children}
            </main>

            <footer className="border-t-4 border-black p-8 mt-auto bg-white">
                <div className="container flex justify-between items-end">
                    <div>
                        <h4 className="font-black text-lg">SPARK SYSTEM 1.0</h4>
                        <p className="text-sm mt-2 max-w-md">
                            ASSEST INTEGRITY MANAGEMENT PLATFORM.
                            DESIGNED FOR HIGH-RISK INDUSTRIAL ENVIRONMENTS.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-xs">BUILD: 2026.02.06</div>
                        <div className="font-mono text-xs">SECURE CONNECTION</div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
