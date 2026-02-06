
import React, { useState } from 'react';
import { RiskBadge } from '../components/AssetTable';
import TrendChart from '../components/TrendChart';
import ExplainabilityDrawer from '../components/ExplainabilityDrawer';
import ReportModal from '../components/ReportModal';

const AssetDetails = () => {
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isReportOpen, setReportOpen] = useState(false);

    // Mock Data
    const asset = {
        id: 'PV-12',
        name: 'Pressure Vessel 12',
        type: 'Pressure Vessel',
        risk: 'High',
        health: 42,
        meta: {
            material: 'Carbon Steel A516',
            designPressure: '150 bar',
            operatingTemp: '450°C',
            installed: '2018-05-12'
        }
    };

    return (
        <div className="container py-8">
            <ExplainabilityDrawer
                isOpen={isDrawerOpen}
                onClose={() => setDrawerOpen((prev) => !prev)}
            />

            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setReportOpen((prev) => !prev)}
                assetId={asset.id}
            />

            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b-4 border-black pb-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-5xl font-black">{asset.id}</h1>
                        <RiskBadge level={asset.risk} />
                    </div>
                    <p className="font-mono text-lg text-gray-600">{asset.name}</p>
                </div>
                <div className="text-right flex gap-4">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="bg-white text-black px-6 py-3 hover:bg-gray-100 border-2 border-black"
                    >
                        WHY THIS RISK?
                    </button>
                    <button
                        onClick={() => setReportOpen(true)}
                        className="bg-red-600 text-white px-6 py-3 hover:bg-red-700 shadow-[4px_4px_0px_0px_black] border-2 border-black"
                    >
                        GENERATE REPORT
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">

                {/* Left Panel: Metadata (3 cols) */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="box">
                        <h3 className="font-black border-b-2 border-black pb-2 mb-4">ASSET DATA</h3>
                        <dl className="space-y-4 font-mono text-sm">
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Material</dt>
                                <dd className="font-bold">{asset.meta.material}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Design Pressure</dt>
                                <dd className="font-bold">{asset.meta.designPressure}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Operating Temp</dt>
                                <dd className="font-bold">{asset.meta.operatingTemp}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Installation Date</dt>
                                <dd className="font-bold">{asset.meta.installed}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="box bg-blue-50">
                        <h3 className="font-black border-b-2 border-black pb-2 mb-4">INSPECTION HISTORY</h3>
                        <ul className="space-y-2 text-sm font-mono">
                            <li className="flex justify-between">
                                <span>2025-12-01</span>
                                <span className="bg-green-600 text-white px-1">PASS</span>
                            </li>
                            <li className="flex justify-between">
                                <span>2024-06-15</span>
                                <span className="bg-yellow-400 text-black px-1 border border-black">FLAG</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Center Panel: Digital Twin (6 cols) */}
                <div className="lg:col-span-6">
                    <div className="box h-full min-h-[500px] relative bg-gray-900 flex items-center justify-center overflow-hidden">
                        <div className="absolute top-4 left-4 bg-black text-white px-2 py-1 font-mono text-xs border border-white">
                            VIEW: DIGITAL TWIN [LIVE]
                        </div>

                        {/* Abstract Asset Representation */}
                        {/* Main Body */}
                        <div className="w-48 h-80 border-4 border-white rounded-3xl relative">
                            {/* Corrosion Zone Overlay */}
                            <div className="absolute bottom-10 right-0 w-full h-24 bg-red-500/50 border-t-2 border-b-2 border-red-500 animate-pulse"></div>

                            {/* Connectors */}
                            <div className="absolute -left-12 top-10 w-12 h-4 border-2 border-white bg-gray-800"></div>
                            <div className="absolute -right-12 bottom-20 w-12 h-4 border-2 border-white bg-gray-800"></div>
                        </div>

                        {/* Annotations */}
                        <div className="absolute bottom-20 right-10 flex items-center gap-2">
                            <div className="w-24 h-[1px] bg-white"></div>
                            <div className="bg-white text-black text-xs font-bold p-1 border-2 border-red-500">
                                CRITICAL THICKNESS LOSS
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Health & KPIs (3 cols) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Health Score */}
                    <div className="box text-center">
                        <h3 className="font-bold uppercase text-sm mb-2">Health Score</h3>
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-[6px] border-black relative">
                            <span className="text-5xl font-black">{asset.health}</span>
                            <div className="absolute bottom-0 bg-red-600 text-white text-xs px-2 font-bold uppercase">Critical</div>
                        </div>
                        <p className="mt-4 text-xs font-bold uppercase text-red-600 animate-pulse">
                            Action Required
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="box bg-yellow-400 border-black">
                        <h3 className="font-black mb-2 uppercase">Recommendation</h3>
                        <p className="text-sm font-bold mb-4">
                            Immediate UT inspection required on shell sector 4.
                        </p>
                        <button className="w-full bg-black text-white py-2 font-bold border-2 border-white hover:bg-gray-800">
                            SCHEDULE REPAIR
                        </button>
                    </div>

                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="w-full border-2 border-black py-3 font-bold hover:bg-blue-50 text-blue-800 uppercase text-sm"
                    >
                        Analysis Details &rarr;
                    </button>
                </div>
            </div>

            {/* Bottom: Charts */}
            <div className="grid md:grid-cols-2 gap-8 mt-8">
                <TrendChart
                    title="Wall Thickness (mm)"
                    data={[12.5, 12.4, 12.3, 12.1, 11.5, 10.8]}
                    color="#FF4444" // Red for danger
                />
                <TrendChart
                    title="Vibration (mm/s)"
                    data={[2.1, 2.2, 2.1, 2.4, 3.8, 4.1]}
                    color="#FFD700" // Yellow for warning
                />
            </div>
        </div>
    );
};

export default AssetDetails;

