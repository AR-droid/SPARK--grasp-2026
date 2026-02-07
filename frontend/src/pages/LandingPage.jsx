import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-8 relative overflow-hidden">

            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 rounded-full border-4 border-black animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 border-4 border-black rotate-45"></div>
            </div>

            <div className="relative z-10 text-center max-w-4xl">
                <div className="mb-8 inline-block bg-black text-white px-4 py-1 font-mono text-sm uppercase tracking-widest border-2 border-white">
                    System v2.0 Online
                </div>

                <h1 className="text-8xl md:text-9xl font-black tracking-tighter mb-6 leading-none shadow-black drop-shadow-lg">
                    SPARK
                </h1>

                <p className="text-2xl md:text-3xl font-bold mb-12 max-w-2xl mx-auto leading-tight">
                    Next-Gen Asset Integrity & <br />
                    <span className="bg-black text-white px-2">Decision Intelligence</span>
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                    <Link to="/login">
                        <button
                            className="bg-white text-black text-xl px-12 py-6 font-black uppercase border-4 border-black shadow-[8px_8px_0px_0px_black] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_black] transition-all"
                        >
                            ENTER PLATFORM
                        </button>
                    </Link>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mt-16">
                <div
                    className="border-4 border-black bg-blue-700 text-white p-6 shadow-[8px_8px_0px_0px_black]"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
                        backgroundSize: '18px 18px'
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-xs font-mono uppercase">Integrity Console</div>
                            <div className="text-2xl font-black">SPARK Live Panel</div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 border-2 border-white rounded-full"></div>
                            <div className="w-6 h-6 border-2 border-white"></div>
                            <div className="w-6 h-6 border-2 border-white rotate-45"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white text-black border-4 border-black p-4 text-center font-black uppercase">
                            Asset Scan
                        </div>
                        <div className="bg-white text-black border-4 border-black p-4 text-center font-black uppercase">
                            Risk Heatmap
                        </div>
                        <div className="bg-white text-black border-4 border-black p-4 text-center font-black uppercase">
                            Twin Sync
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white text-black border-4 border-black p-4">
                            <div className="text-xs font-mono uppercase">Inspection Sweep</div>
                            <div className="text-3xl font-black">96% Coverage</div>
                            <div className="text-xs font-mono">Based on sensor + inspection uploads.</div>
                        </div>
                        <div className="bg-yellow-400 text-black border-4 border-black p-4">
                            <div className="text-xs font-mono uppercase">Reasoning Layer</div>
                            <div className="text-2xl font-black">RoF × CoF Online</div>
                            <div className="text-xs font-mono">Explainable decisions per asset.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 text-xs font-mono font-bold">
                POWERED BY AR-DROID • GRASP 2026
            </div>
        </div>
    );
};

export default LandingPage;
