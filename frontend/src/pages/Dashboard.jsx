import React from 'react';
import KpiCard from '../components/KpiCard';
import { AssetTable } from '../components/AssetTable';

const Dashboard = () => {
    return (
        <div className="container py-12">
            <div className="flex justify-between items-end mb-8 border-b-4 border-black pb-4">
                <div>
                    <h1 className="text-4xl font-black">PORTFOLIO OVERVIEW</h1>
                    <p className="font-mono mt-1 text-sm bg-black text-white inline-block px-2">
                        UNIT: CHEMICAL-A // ROLE: ADMIN
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-xs font-bold uppercase">Last Scan</div>
                        <div className="font-mono">14:02 UTC</div>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <KpiCard
                    title="Total Assets"
                    value="125"
                    color="gray"
                    icon={<div className="font-black text-xs">ALL</div>}
                />
                <KpiCard
                    title="High Criticality"
                    value="15"
                    color="red"
                    icon={<div className="w-3 h-3 bg-red-500 rounded-full"></div>}
                />
                <KpiCard
                    title="Medium Risk"
                    value="42"
                    color="yellow"
                    icon={<div className="w-3 h-3 bg-yellow-400"></div>}
                />
                <KpiCard
                    title="Stable / Low"
                    value="68"
                    color="green"
                    icon={<div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-green-600"></div>}
                />
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Table (Spans 2 cols) */}
                <div className="lg:col-span-2 space-y-8">
                    <AssetTable />

                    {/* Degradation Alert Box */}
                    <div className="box bg-yellow-400 border-black">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-xl mb-2">⚠ DEGRADATION DETECTED</h3>
                                <p className="font-bold border-l-4 border-black pl-4 py-1 text-sm max-w-md">
                                    Asset PV-12 showing accelerated corrosion rates (0.5mm/yr).
                                    Immediate inspection recommended.
                                </p>
                            </div>
                            <button className="bg-black text-white px-6 py-2 hover:bg-gray-800">
                                Investigate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Filters (Spans 1 col) */}
                <div className="space-y-8">
                    {/* Filter Panel */}
                    <div className="box">
                        <h3 className="text-lg font-black uppercase mb-4">Dust Threshold</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Asset Class</label>
                                <select className="w-full border-2 border-black p-2 font-mono">
                                    <option>All Assets</option>
                                    <option>Pressure Vessels</option>
                                    <option>Piping</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Risk Level</label>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200">High</button>
                                    <button className="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200">Med</button>
                                    <button className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200">Low</button>
                                </div>
                            </div>
                            <div className="pt-4 border-t-2 border-black">
                                <button className="w-full bg-black text-white py-3 hover:bg-gray-800">
                                    APPLY FILTERS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
