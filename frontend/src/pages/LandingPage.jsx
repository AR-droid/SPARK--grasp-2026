import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="container min-h-[80vh] flex flex-col justify-center py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">

                {/* Left Column: Text */}
                <div className="space-y-8">
                    <div className="inline-block border-2 border-black bg-yellow-400 px-4 py-1 font-bold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        AI-Powered Asset Integrity
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black leading-none uppercase">
                        Rescue Your <br />
                        <span className="text-white bg-black px-2">Assets.</span> <br />
                        Prevent Failures.
                    </h1>

                    <p className="text-lg md:text-xl font-mono max-w-lg border-l-4 border-black pl-4">
                        SPARK is the industrial janitor for complexity. Monitor degradation,
                        predict failures, and ensure accountability with precision tools.
                        Zero fluff.
                    </p>

                    <div className="flex gap-4 pt-4">
                        <Link to="/dashboard">
                            <button className="px-8 py-4 bg-red-600 text-white text-lg hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_black]">
                                Start Analysis &rarr;
                            </button>
                        </Link>
                        <button className="px-8 py-4 bg-white text-black text-lg hover:bg-gray-50">
                            View Portfolio
                        </button>
                    </div>
                </div>

                {/* Right Column: Hero Visual (The "Dusty Mascot" equivalent) */}
                <div className="border-4 border-black p-8 bg-blue-600 relative min-h-[500px] flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-black bg-white"></div>
                        <div className="w-4 h-4 border-2 border-black bg-white"></div>
                        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-white"></div>
                    </div>

                    <h2 className="text-white text-4xl font-black uppercase">
                        Digital Twin <br /> v1.0
                    </h2>

                    {/* Abstract Geometry */}
                    <div className="flex justify-between items-center my-12">
                        <div className="w-24 h-24 border-4 border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_black]">
                            <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-black"></div>
                        </div>
                        <div className="h-2 flex-grow bg-black mx-4"></div>
                        <div className="w-24 h-24 border-4 border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_black]">
                            <div className="w-8 h-8 bg-red-600 border-2 border-black rounded-full"></div>
                        </div>
                        <div className="h-2 flex-grow bg-black mx-4"></div>
                        <div className="w-24 h-24 border-4 border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_black]">
                            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-black"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_black]">
                            <div className="text-xs font-bold uppercase mb-1">Precision Sweep</div>
                            <div className="text-3xl font-black">98%</div>
                            <div className="text-xs text-gray-500">Recovery Rate</div>
                        </div>
                        <div className="bg-yellow-400 border-2 border-black p-4 shadow-[4px_4px_0px_0px_black] relative">
                            <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 border-2 border-black">
                                LIVE
                            </div>
                            <div className="text-xs font-bold uppercase mb-1">Built On</div>
                            <div className="text-2xl font-black">SPARK CORE</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingPage;
