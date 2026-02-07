import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import KpiCard from '../components/KpiCard';
import { AssetTable } from '../components/AssetTable';
import { AssetService, AnalysisService, api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { currentProject, userRole } = useProject();
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [kpi, setKpi] = useState({ total: 0, high: 0, medium: 0, stable: 0 });
    const [sensorFile, setSensorFile] = useState(null);
    const [inspectionFile, setInspectionFile] = useState(null);
    const [uploadMsg, setUploadMsg] = useState('');
    const [lcaData, setLcaData] = useState({ costs: [], impacts: [] });
    const [selectedAsset, setSelectedAsset] = useState('');
    const [metric, setMetric] = useState('');

    useEffect(() => {
        const useDevAuth = import.meta.env.VITE_USE_DEV_AUTH === 'true';
        if (useDevAuth) {
            const token = localStorage.getItem('dev_token');
            if (!token) {
                navigate('/login');
            }
            return;
        }
        if (!authLoading && !session) {
            navigate('/login');
        }
    }, [authLoading, session, navigate]);

    useEffect(() => {
        // If loaded and no project, redirect to project selection page
        if (!loading && !currentProject) {
            navigate('/projects');
        }
    }, [loading, currentProject, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentProject) return; // Don't fetch if no project context

            try {
                // Pass project ID to API
                const data = await AssetService.getAllAssets(currentProject.id);
                setAssets(data);

                // Calc KPIs
                const high = data.filter(a => a.risk_level === 'High').length;
                const medium = data.filter(a => a.risk_level === 'Medium').length;
                const stable = data.length - high - medium;

                setKpi({
                    total: data.length,
                    high,
                    medium,
                    stable
                });
                const lca = await AnalysisService.getLcaSummary();
                setLcaData(lca);
            } catch (err) {
                console.error("Failed to fetch assets", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentProject]); // Re-run when project changes

    if (loading) return <div className="p-8 font-black text-xl">LOADING DASHBOARD...</div>;

    // NORMAL STATE: Data exists
    return (
        <div className="container py-12">

            <div className="flex justify-between items-end mb-8 border-b-4 border-black pb-4">
                <div>
                    <h1 className="text-4xl font-black">PORTFOLIO OVERVIEW</h1>
                    <p className="font-mono mt-1 text-sm bg-black text-white inline-block px-2 animate-pulse-slow">
                        UNIT: {currentProject?.plant_name || 'DEMO UNIT'} // ROLE: {(userRole || 'VISITOR').toUpperCase()}
                    </p>
                    <div className="text-xs font-bold mt-1 uppercase text-gray-500">
                        Project: {currentProject?.name || 'No Active Project'}
                    </div>
                </div>
                    <div className="flex gap-4">
                        <a href="/onboarding">
                            <button className="bg-white border-2 border-black px-4 py-2 font-bold uppercase hover:bg-yellow-400 transition-colors shadow-[4px_4px_0px_0px_black] hover:translate-y-[-2px]">
                                + Add Asset & Upload
                            </button>
                        </a>
                        <div className="text-right">
                            <div className="text-xs font-bold uppercase">Last Scan</div>
                            <div className="font-mono">14:02 UTC</div>
                        </div>
                    </div>
                </div>

            <div className="box border-2 border-black mb-8">
                <h3 className="font-black uppercase text-sm mb-2">Upload Sensor / Inspection Data</h3>
                <p className="text-xs font-mono text-gray-600 mb-4">
                    Upload data for selected asset. Metric optional (will default to Generic).
                </p>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <select
                        className="border-2 border-black p-2 font-mono"
                        value={selectedAsset}
                        onChange={(e) => setSelectedAsset(e.target.value)}
                    >
                        <option value="">Select Asset</option>
                        {assets.map(a => (
                            <option key={a.id} value={a.id}>{a.id} — {a.type}</option>
                        ))}
                    </select>
                    <input
                        className="border-2 border-black p-2 font-mono"
                        placeholder="Metric (optional)"
                        value={metric}
                        onChange={(e) => setMetric(e.target.value)}
                    />
                    <input type="file" onChange={(e) => setSensorFile(e.target.files[0])} />
                    <input type="file" onChange={(e) => setInspectionFile(e.target.files[0])} />
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={async () => {
                            if (!selectedAsset || !sensorFile) return;
                            const formData = new FormData();
                            formData.append('file', sensorFile);
                            if (metric) formData.append('metric', metric);
                            const res = await api.post('/ingest/upload-sensor-data', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                params: { project_id: currentProject?.id, asset_id: selectedAsset }
                            });
                            setUploadMsg(res.data.message || 'Sensor uploaded');
                        }}
                        className="bg-black text-white px-4 py-2 font-bold uppercase"
                    >
                        Upload Sensor
                    </button>
                    <button
                        onClick={async () => {
                            if (!selectedAsset || !inspectionFile) return;
                            const formData = new FormData();
                            formData.append('file', inspectionFile);
                            const res = await api.post('/ingest/upload-inspection-data', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                params: { project_id: currentProject?.id, asset_id: selectedAsset }
                            });
                            setUploadMsg(res.data.message || 'Inspection uploaded');
                        }}
                        className="bg-black text-white px-4 py-2 font-bold uppercase"
                    >
                        Upload Inspection
                    </button>
                    <button
                        onClick={async () => {
                            if (!selectedAsset) return;
                            try {
                                const res = await api.post('/analysis/run_asset', {
                                    asset_id: selectedAsset,
                                    metric: metric || undefined,
                                    project_id: currentProject?.id
                                });
                                const data = await AssetService.getAllAssets(currentProject.id);
                                setAssets(data);
                                if (res.data?.seeded) {
                                    setUploadMsg('Analysis complete. Used baseline sample data. KPIs refreshed.');
                                } else {
                                    setUploadMsg('Analysis complete. KPIs refreshed.');
                                }
                            } catch (err) {
                                setUploadMsg(err?.response?.data?.error || 'Analysis failed.');
                            }
                        }}
                        className="bg-yellow-400 border-2 border-black px-4 py-2 font-bold uppercase"
                    >
                        Run Analysis
                    </button>
                </div>
                {uploadMsg && <div className="text-xs font-mono mt-3">{uploadMsg}</div>}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-6">
                <KpiCard
                    title="Total Assets"
                    value={kpi.total}
                    color="gray"
                    icon={<div className="font-black text-xs">ALL</div>}
                />
                <KpiCard
                    title="High Criticality"
                    value={kpi.high}
                    color="red"
                    icon={<div className="w-3 h-3 bg-red-500 rounded-full"></div>}
                />
                <KpiCard
                    title="Medium Risk"
                    value={kpi.medium}
                    color="yellow"
                    icon={<div className="w-3 h-3 bg-yellow-400"></div>}
                />
                <KpiCard
                    title="Stable / Low"
                    value={kpi.stable}
                    color="green"
                    icon={<div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-green-600"></div>}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <KpiCard
                    title="LCA Cost (USD)"
                    value={lcaData.costs?.[0]?.cost_usd ? `$${lcaData.costs[0].cost_usd}` : '—'}
                    color="gray"
                    icon={<div className="font-black text-xs">LCA</div>}
                />
                <KpiCard
                    title="CO₂ Impact (kg)"
                    value={lcaData.impacts?.[0]?.co2_kg ? `${lcaData.impacts[0].co2_kg}` : '—'}
                    color="yellow"
                    icon={<div className="w-3 h-3 bg-green-600 rounded-full"></div>}
                />
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Table (Spans 2 cols) */}
                <div className="lg:col-span-2 space-y-8">
                    {assets.length === 0 ? (
                        <div className="box border-2 border-black bg-gray-50 p-8 text-center font-mono">
                            No assets yet. Use “Add Asset & Upload” to begin.
                        </div>
                    ) : (
                        <AssetTable assets={assets} />
                    )}

                    {/* Degradation Alert Box */}
                    <div className="box bg-yellow-400 border-black">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-xl mb-2">⚠ DEGRADATION DETECTED</h3>
                                <p className="font-bold border-l-4 border-black pl-4 py-1 text-sm max-w-md">
                                    {kpi.high > 0
                                        ? `${kpi.high} Assets showing elevated risk levels.`
                                        : "No critical degradation detected currently."}
                                    {kpi.high > 0 && " Immediate inspection recommended."}
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
