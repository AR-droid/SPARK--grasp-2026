import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RiskBadge } from '../components/AssetTable';
import TrendChart from '../components/TrendChart';
import ExplainabilityDrawer from '../components/ExplainabilityDrawer';
import ReportModal from '../components/ReportModal';
import { ActionService, AssetService, AnalysisService, api } from '../services/api';
import DigitalTwinViewer from '../components/DigitalTwinViewer';
import ActionTimelineChart from '../components/ActionTimelineChart';
import Spectrogram from '../components/Spectrogram';
import { useProject } from '../context/ProjectContext';

const AssetDetails = () => {
    const { id } = useParams();
    const { currentProject } = useProject();
    const [assetData, setAssetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isReportOpen, setReportOpen] = useState(false);
    const [actions, setActions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [lcaData, setLcaData] = useState({ costs: [], impacts: [] });
    const [sensorFile, setSensorFile] = useState(null);
    const [inspectionFile, setInspectionFile] = useState(null);
    const [metric, setMetric] = useState('');
    const [uploadMsg, setUploadMsg] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [audioResult, setAudioResult] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await AssetService.getAssetDetails(id);
                setAssetData(data);
                const actionData = await ActionService.listByAsset(id);
                setActions(actionData);
                if (currentProject?.id) {
                    const summaryData = await AnalysisService.getAssetSummary(id, currentProject.id);
                    setSummary(summaryData);
                }
                try {
                    const lca = await AnalysisService.getLcaSummary();
                    setLcaData(lca);
                } catch (err) {
                    // ignore LCA errors in demo
                }
            } catch (err) {
                console.error("Failed to load asset", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, currentProject]);

    if (loading) return <div className="p-12 text-center font-black text-2xl">LOADING ASSET TWIN...</div>;
    if (!assetData) return <div className="p-12 text-center font-black text-2xl text-red-600">ASSET NOT FOUND</div>;

    const { asset, history, risk, explainability, inspections } = assetData;
    const latestMetric = history && history.length > 0 ? history[history.length - 1].type : '';
    const latestReading = history && history.length > 0 ? history[history.length - 1] : null;
    const metricForTwin = audioResult ? 'audio' : latestMetric;

    const formatAttribute = (attr) => {
        if (!attr) return 'N/A';
        if (typeof attr === 'object' && attr.value !== undefined) {
            return attr.unit ? `${attr.value} ${attr.unit}` : `${attr.value}`;
        }
        return `${attr}`;
    };

    // Process history for charts
    // Chart expects simple array of numbers for now, or labels?
    // Let's assume TrendChart takes a 'data' array of values.
    const chartValues = history.map(h => h.value).slice(0, 20).reverse(); // Last 20 points

    return (
        <div className="container py-8">
            <ExplainabilityDrawer
                isOpen={isDrawerOpen}
                onClose={() => setDrawerOpen((prev) => !prev)}
                data={explainability}
                confidence={risk?.confidence}
                assetId={asset.id}
                projectId={currentProject?.id}
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
                        <RiskBadge
                            level={
                                risk?.risk_score > 0.7
                                    ? 'High'
                                    : risk?.risk_score > 0.3
                                        ? 'Medium'
                                        : 'Low'
                            }
                        />
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
                        <div className="flex gap-4 mb-8">
                            <div className="bg-black text-white px-4 py-2 font-mono text-sm">
                                ID: {asset.id}
                            </div>
                            <div className="bg-yellow-400 text-black px-4 py-2 font-mono text-sm flex items-center gap-2 cursor-pointer hover:bg-yellow-300">
                                <span>🔊</span> Listen to Asset (Audio Context)
                            </div>
                        </div>
                        <div className="border-2 border-black p-3 mb-6">
                            <div className="text-xs font-bold uppercase mb-2">Audio Analysis (Live)</div>
                            <div className="flex flex-col gap-2">
                                <input type="file" accept=".wav" onChange={(e) => setAudioFile(e.target.files[0])} />
                                <button
                                    onClick={async () => {
                                        try {
                                            const formData = new FormData();
                                            if (audioFile) {
                                                formData.append('file', audioFile);
                                            }
                                            formData.append('asset_id', asset.id);
                                            const res = await api.post('/analysis/run_audio', formData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            setAudioResult(res.data);
                                            setUploadMsg(`Audio analyzed (${res.data?.source || 'upload'})`);
                                        } catch (err) {
                                            setUploadMsg(err?.response?.data?.error || 'Audio analysis failed.');
                                        }
                                    }}
                                    className="w-full border-2 border-black py-2 font-bold uppercase bg-white hover:bg-gray-100"
                                >
                                    Run Audio Analysis
                                </button>
                                {audioResult && (
                                    <div className="text-xs font-mono">
                                        Prediction: {audioResult.result?.prediction} · Confidence: {Math.round((audioResult.result?.confidence || 0) * 100)}%
                                    </div>
                                )}
                                <Spectrogram
                                    file={audioFile}
                                    mode="sine"
                                    onAnalysis={(bands) => {
                                        const max = Math.max(bands.low, bands.mid, bands.high);
                                        let label = 'Balanced spectrum';
                                        if (max === bands.low) label = 'Low-band dominant (imbalance / looseness)';
                                        else if (max === bands.mid) label = 'Mid-band dominant (bearing / resonance)';
                                        else if (max === bands.high) label = 'High-band dominant (cavitation / leak hiss)';
                                        setUploadMsg(label);
                                    }}
                                />
                            </div>
                        </div>
                        <dl className="space-y-4 font-mono text-sm">
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Location</dt>
                                <dd className="font-bold">{asset.location || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Type</dt>
                                <dd className="font-bold">{asset.type}</dd>
                            </div>
                            {asset.metadata && (
                                <>
                                    <div className="pt-2 border-t-2 border-black">
                                        <dt className="text-xs font-bold uppercase text-gray-500">Extracted Metadata</dt>
                                        <dd className="mt-2 space-y-2">
                                            {Object.entries(asset.metadata)
                                                .filter(([key]) => key !== '_context')
                                                .map(([key, val]) => {
                                                    const label = key.replace(/_/g, ' ').toUpperCase();
                                                    return (
                                                        <div key={key} className="flex items-center justify-between border border-black px-2 py-1">
                                                            <span className="text-xs font-bold">{label}</span>
                                                            <span className="text-xs font-mono font-bold">{formatAttribute(val)}</span>
                                                        </div>
                                                    );
                                                })}
                                        </dd>
                                    </div>
                                    {asset.metadata._context && (
                                        <div>
                                            <dt className="text-xs font-bold uppercase text-gray-500">Metadata Source</dt>
                                            <dd className="font-bold">
                                                {asset.metadata._context.source || 'Unknown'} · {asset.metadata._context.extracted_at || 'N/A'}
                                            </dd>
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Last Updated</dt>
                                <dd className="font-bold">{history[0]?.timestamp || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold uppercase text-gray-500">Sensor ID</dt>
                                <dd className="font-bold">{history[0]?.id || '-'}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="box bg-blue-50">
                        <h3 className="font-black border-b-2 border-black pb-2 mb-4">INSPECTION HISTORY</h3>
                        {inspections && inspections.length > 0 ? (
                            <ul className="space-y-2 text-sm font-mono">
                                {inspections.map((i, idx) => (
                                    <li key={idx} className="flex justify-between">
                                        <span>{i.timestamp?.slice(0, 10)}</span>
                                        <span className={`px-1 border border-black ${i.severity === 'Critical' ? 'bg-red-600 text-white' : i.severity === 'Low' ? 'bg-green-600 text-white' : 'bg-yellow-400 text-black'}`}>
                                            {i.severity || 'INFO'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm font-mono text-gray-500">No inspection records.</div>
                        )}
                    </div>

                    <div className="box bg-white">
                        <h3 className="font-black border-b-2 border-black pb-2 mb-4">SENSOR DETAILS</h3>
                        {history && history.length > 0 ? (
                            <div className="space-y-2 text-xs font-mono">
                                {history.slice(-8).reverse().map((h, idx) => (
                                    <div key={idx} className="flex items-center justify-between border border-black px-2 py-1">
                                        <span>{h.timestamp ? h.timestamp.slice(0, 19) : 'N/A'}</span>
                                        <span className="font-bold">{h.type}</span>
                                        <span className="font-bold">{h.value}{h.unit ? ` ${h.unit}` : ''}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm font-mono text-gray-500">No sensor data.</div>
                        )}
                    </div>

                    <div className="box bg-white">
                        <h3 className="font-black border-b-2 border-black pb-2 mb-4">ACTION HISTORY</h3>
                        {actions.length === 0 ? (
                            <div className="text-sm font-mono text-gray-500">No actions recorded.</div>
                        ) : (
                            <ul className="space-y-3 text-sm font-mono">
                                {actions.map((action) => (
                                    <li key={action.id} className="border-l-2 border-black pl-3">
                                        <div className="font-bold uppercase">{action.recommendation}</div>
                                        <div>Status: {action.status}</div>
                                        <div>Approved: {action.approved_action || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{action.created_at}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="box bg-white">
                        <h3 className="font-black border-b-2 border-black pb-2 mb-4">DATA INPUT</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full border-2 border-black p-2 font-mono text-sm"
                                placeholder="Metric (optional)"
                                value={metric}
                                onChange={(e) => setMetric(e.target.value)}
                            />
                            <input type="file" onChange={(e) => setSensorFile(e.target.files[0])} />
                            <button
                                onClick={async () => {
                                    if (!sensorFile) return;
                                    const formData = new FormData();
                                    formData.append('file', sensorFile);
                                    formData.append('asset_id', asset.id);
                                    if (metric) formData.append('metric', metric);
                                    const res = await api.post('/ingest/upload-sensor-data', formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                        params: { project_id: asset.project_id, asset_id: asset.id }
                                    });
                                    const refreshed = await AssetService.getAssetDetails(id);
                                    setAssetData(refreshed);
                                    setUploadMsg(res.data.message || 'Sensor uploaded');
                                }}
                                className="w-full bg-black text-white py-2 font-bold uppercase"
                            >
                                Upload Sensor
                            </button>
                            <input type="file" onChange={(e) => setInspectionFile(e.target.files[0])} />
                            <button
                                onClick={async () => {
                                    if (!inspectionFile) return;
                                    const formData = new FormData();
                                    formData.append('file', inspectionFile);
                                    formData.append('asset_id', asset.id);
                                    const res = await api.post('/ingest/upload-inspection-data', formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                        params: { project_id: asset.project_id, asset_id: asset.id }
                                    });
                                    const refreshed = await AssetService.getAssetDetails(id);
                                    setAssetData(refreshed);
                                    setUploadMsg(res.data.message || 'Inspection uploaded');
                                }}
                                className="w-full bg-black text-white py-2 font-bold uppercase"
                            >
                                Upload Inspection
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await api.post('/analysis/run_asset', {
                                            asset_id: asset.id,
                                            metric: metric || undefined,
                                            project_id: asset.project_id
                                        });
                                        const data = await AssetService.getAssetDetails(id);
                                        setAssetData(data);
                                        if (res.data?.seeded) {
                                            setUploadMsg('Analysis complete. Used baseline sample data.');
                                        } else {
                                            setUploadMsg('Analysis complete.');
                                        }
                                    } catch (err) {
                                        setUploadMsg(err?.response?.data?.error || 'Analysis failed.');
                                    }
                                }}
                                className="w-full border-2 border-black py-2 font-bold uppercase bg-yellow-400"
                            >
                                Run Analysis
                            </button>
                            {uploadMsg && <div className="text-xs font-mono">{uploadMsg}</div>}
                        </div>
                    </div>
                </div>

                {/* Center Panel: Digital Twin (6 cols) */}
                <div className="lg:col-span-6">
                    <div className="box h-full min-h-[500px] relative bg-gray-900 flex items-center justify-center overflow-hidden">
                        <div className="absolute top-4 left-4 bg-black text-white px-2 py-1 font-mono text-xs border border-white">
                            VIEW: DIGITAL TWIN [LIVE]
                        </div>

                        <DigitalTwinViewer
                            assetType={asset.type}
                            assetId={asset.id}
                            activeMetric={metricForTwin}
                            latestReading={latestReading}
                        />
                    </div>
                </div>

                {/* Right Panel: Health & KPIs (3 cols) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Health Score */}
                    <div className="box text-center">
                        <h3 className="font-bold uppercase text-sm mb-2">Health Score</h3>
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-[6px] border-black relative">
                            <span className="text-5xl font-black">{Math.round((1 - (risk?.risk_score || 0)) * 100)}</span>
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
                            Risk Score: {risk?.risk_score?.toFixed(2) || 0}
                            <br />
                            {risk?.degradation_type || "No specific degradation"}
                        </p>
                        <Link to="/actions">
                            <button className="bg-yellow-400 text-black px-6 py-3 font-black uppercase hover:bg-white transition-colors">
                                Open Action Center
                            </button>
                        </Link>
                    </div>

                    {summary && (
                        <div className="box bg-white border-black">
                            <h3 className="font-black mb-2 uppercase">Baseline</h3>
                            <p className="text-sm font-mono">
                                Confidence: {Math.round((summary.baseline?.confidence || 0) * 100)}%
                            </p>
                        </div>
                    )}

                    {summary && (
                        <div className="box bg-white border-black">
                            <h3 className="font-black mb-2 uppercase">Propagation</h3>
                            <p className="text-sm font-mono">
                                Affected Assets: {summary.propagation?.affected_count || 0}
                            </p>
                        </div>
                    )}

                    <div className="box bg-white border-black">
                        <h3 className="font-black mb-2 uppercase">Signal → Failure</h3>
                        <div className="text-sm font-mono space-y-2">
                            <div>Signal: {latestReading?.type || 'N/A'}</div>
                            <div>Value: {latestReading ? `${latestReading.value}${latestReading.unit ? ` ${latestReading.unit}` : ''}` : 'N/A'}</div>
                            <div>Failure Mode: {risk?.degradation_type || 'N/A'}</div>
                            <div>Confidence: {Math.round((risk?.confidence || 0) * 100)}%</div>
                        </div>
                    </div>

                    <div className="box bg-white border-black">
                        <h3 className="font-black mb-2 uppercase">LCA Snapshot</h3>
                        <div className="text-sm font-mono space-y-3">
                            <div className="border-2 border-black p-2">
                                <div className="text-xs uppercase font-bold mb-1">Cost (USD)</div>
                                {lcaData.costs?.length ? (
                                    lcaData.costs.map((c, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{c.action}</span>
                                            <span>${c.cost_usd}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-gray-500">No cost data.</div>
                                )}
                            </div>
                            <div className="border-2 border-black p-2">
                                <div className="text-xs uppercase font-bold mb-1">CO₂ Impact (kg)</div>
                                {lcaData.impacts?.length ? (
                                    lcaData.impacts.map((c, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{c.action}</span>
                                            <span>{c.co2_kg} kg</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-gray-500">No impact data.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {summary && summary.decisions && (
                        <div className="box bg-white border-black">
                            <h3 className="font-black mb-2 uppercase">Decision Support</h3>
                            <ul className="text-sm font-mono space-y-2">
                                {summary.decisions.map((d, idx) => (
                                    <li key={idx}>
                                        {d.option} — Safety: {d.safety_impact}, Cost: {d.cost}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

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
                    title={`Sensor Value (${history[0]?.unit || 'Units'})`}
                    data={chartValues}
                    color="#FFD700"
                />
            </div>

            {actions.length > 0 && (
                <div className="mt-8">
                    <ActionTimelineChart actions={actions} />
                </div>
            )}
        </div>
    );
};

export default AssetDetails;
