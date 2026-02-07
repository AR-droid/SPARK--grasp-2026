import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api, AssetService } from '../services/api';
import ConnectivityGraph from '../components/ConnectivityGraph';
import { useProject } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';

const UploadCenter = () => {
    const { currentProject } = useProject();
    const navigate = useNavigate();
    useEffect(() => {
        // Asset-wise ingestion moved to onboarding page
        navigate('/onboarding');
    }, [navigate]);
    const [activeTab, setActiveTab] = useState('drawing'); // drawing, twin, data, inspection
    const [dragging, setDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [assets, setAssets] = useState([]);
    const [assetId, setAssetId] = useState('');
    const [metric, setMetric] = useState('');
    const [startTime, setStartTime] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!currentProject) {
            navigate('/projects');
        }
        const fetchAssets = async () => {
            if (!currentProject) return;
            try {
                const data = await AssetService.getAllAssets(currentProject.id);
                setAssets(data);
            } catch (err) {
                console.error("Failed to load assets", err);
            }
        };
        fetchAssets();
    }, [currentProject]);

    const onDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const onDragLeave = () => {
        setDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(droppedFiles);
    };

    const onFilePick = (e) => {
        const picked = Array.from(e.target.files || []);
        setFiles(picked);
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setAnalyzing(true);
        const formData = new FormData();

        try {
            let endpoint = '';

            if (activeTab === 'drawing') {
                formData.append('file', files[0]);
                endpoint = '/ingest/analyze-image';
            } else if (activeTab === 'twin') {
                Array.from(files).forEach(file => {
                    formData.append('files', file);
                });
                endpoint = '/ingest/create-twin';
            } else if (activeTab === 'data') {
                formData.append('file', files[0]);
                if (assetId) formData.append('asset_id', assetId);
                if (metric) formData.append('metric', metric);
                if (startTime) formData.append('start_time', startTime);
                // Pass project ID if available in context, but for now header or query param
                // We'll append it to form data as well for simplicity
                // endpoint = `/ingest/upload-sensor-data?project_id=${currentProject?.id}`;
                endpoint = '/ingest/upload-sensor-data';
            } else if (activeTab === 'inspection') {
                formData.append('file', files[0]);
                endpoint = '/ingest/upload-inspection-data';
            } else {
                alert("Data upload not implemented yet");
                setAnalyzing(false);
                return;
            }

            const response = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                params: { project_id: currentProject?.id } // Pass project_id
            });

            setResults(response.data.data || response.data);

            if (activeTab === 'twin' || activeTab === 'data') {
                alert(response.data.message || "Upload successful");
            }

            if (activeTab === 'drawing' || activeTab === 'data' || activeTab === 'inspection') {
                // Redirect to dashboard to reflect newly ingested assets/risk
                setTimeout(() => navigate('/dashboard'), 500);
            }

        } catch (err) {
            console.error("Upload failed", err);
            alert(err.response?.data?.error || "Upload failed");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="container py-8">
            <h1 className="text-4xl font-black uppercase mb-8">Data Ingestion Hub</h1>

            {/* Tabs */}
            {/* Tabs - RESTRICTED TO P&ID ONLY AS PER USER REQUEST */}
            <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
                <button
                    onClick={() => setActiveTab('drawing')}
                    className={`flex-1 py-4 font-black uppercase text-sm tracking-wide ${activeTab === 'drawing' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                    Engineering Drawings (P&ID) / Asset Discovery
                </button>
                {/* Digital Twin (Paused)
                <button
                    onClick={() => setActiveTab('twin')}
                    className={`flex-1 py-4 font-black uppercase text-sm tracking-wide ${activeTab === 'twin' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                    Digital Twin (Photoset)
                </button>
                */}
                <button
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 py-4 font-black uppercase text-sm tracking-wide border-l-2 border-white ${activeTab === 'data' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                    Sensor / Inspection Data
                </button>
                <button
                    onClick={() => setActiveTab('inspection')}
                    className={`flex-1 py-4 font-black uppercase text-sm tracking-wide border-l-2 border-white ${activeTab === 'inspection' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                    Inspection Logs
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Upload Zone */}
                <div>
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-4 border-dashed h-64 flex flex-col items-center justify-center p-8 transition-colors ${dragging ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-gray-50'}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple={activeTab === 'twin'}
                            className="hidden"
                            onChange={onFilePick}
                        />
                        {files.length > 0 ? (
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-2">📄 {files.length} File(s) Selected</div>
                                <div className="text-sm text-gray-500">Ready to upload</div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400">
                                <div className="text-6xl mb-4">📂</div>
                                <div className="font-bold uppercase">
                                    {/* {activeTab === 'twin' ? 'Drop 20+ Photos Here' : 'Drag P&ID or Images Here'} */}
                                    {activeTab === 'data' ? 'Drag Sensor CSV File Here' : activeTab === 'inspection' ? 'Drag Inspection CSV Here' : 'Drag P&ID / Engineering Drawings Here'}
                                </div>
                                <div className="text-xs mt-2">
                                    {/* {activeTab === 'twin' ? 'Required for 3D Reconstruction' : 'Supports JPG, PNG, PDF'} */}
                                    {activeTab === 'data' ? 'Format: AssetID, Timestamp, Value, Type' : activeTab === 'inspection' ? 'Format: asset_id, date, finding, severity' : 'Supports JPG, PNG, PDF (High Resolution)'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Format Hints */}
                    <div className="mt-4 text-center text-xs text-gray-400 font-mono">
                        Recommended: High-Res P&ID Scans (300 DPI+)
                        {/* {activeTab === 'drawing' && "Recommended: High-Res P&ID Scans (300 DPI+)"}
                        {activeTab === 'twin' && "Tip: Overlap photos by 70% for best results."}
                        {activeTab === 'data' && "Format: AssetID, Metric, Value, Timestamp"} */}
                    </div>

                    {activeTab === 'data' && (
                        <div className="mt-6 space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Asset</label>
                                <select
                                    className="w-full border-2 border-black p-2 font-mono"
                                    value={assetId}
                                    onChange={(e) => setAssetId(e.target.value)}
                                >
                                    <option value="">Select Asset (optional if CSV includes asset_id)</option>
                                    {assets.map(asset => (
                                        <option key={asset.id} value={asset.id}>
                                            {asset.id} — {asset.type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Metric</label>
                                <input
                                    className="w-full border-2 border-black p-2 font-mono"
                                    placeholder="e.g. pressure, vibration, temperature"
                                    value={metric}
                                    onChange={(e) => setMetric(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Start Time (optional)</label>
                                <input
                                    className="w-full border-2 border-black p-2 font-mono"
                                    placeholder="ISO time, e.g. 2026-02-07T12:00:00Z"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                                Time column is interpreted as seconds offset from start time.
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || analyzing}
                        className={`w-full mt-4 py-4 font-black uppercase text-white transition-all ${files.length > 0 ? 'bg-black hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        {analyzing ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Processing with Gemini...
                            </span>
                        ) : "Start Extraction"}
                    </button>
                </div>

                {/* Results Panel */}
                <div>
                    {analyzing && (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-2"></span>
                            Analyzing...
                        </div>
                    )}
                    {!analyzing && results ? (
                        <div>
                            {activeTab !== 'data' && results.assets && (
                                <div>
                                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Identified Assets ({results.assets.length})</h4>
                                    <div className="space-y-2 mb-6">
                                        {results.assets.map((asset, i) => (
                                            <div key={i} className="flex justify-between items-center bg-gray-50 p-2 border border-black">
                                                <span className="font-bold">{asset.tag}</span>
                                                <span className="text-xs bg-black text-white px-2 py-1">{asset.type}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Connectivity ({results.connections?.length || 0})</h4>
                                        <div className="space-y-1 mb-4">
                                            {results.connections?.map((conn, i) => (
                                                <div key={i} className="text-xs font-mono">
                                                    {conn.source} <span className="text-gray-400">--[{conn.medium}]--&gt;</span> {conn.target}
                                                </div>
                                            ))}
                                        </div>
                                        <ConnectivityGraph assets={results.assets} connections={results.connections} />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'data' && (
                                <div className="p-4 bg-gray-50 border border-gray-200">
                                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Ingestion Quality Report</h4>

                                    {results.quality_report && (
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold uppercase text-xs">Data Health Score</span>
                                                <span className={`font-black text-xl ${results.quality_report.score > 80 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {results.quality_report.score}%
                                                </span>
                                            </div>

                                            {results.quality_report.flags.length > 0 && (
                                                <ul className="text-xs text-red-500 list-disc pl-4 space-y-1">
                                                    {results.quality_report.flags.map((flag, i) => (
                                                        <li key={i}>{flag}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Summary</h4>
                                    <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(results.data, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                            Waiting for upload...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadCenter;
