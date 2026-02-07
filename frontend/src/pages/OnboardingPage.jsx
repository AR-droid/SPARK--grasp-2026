import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { AssetCreateService, api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyAsset = () => ({ id: '', name: '', type: '', location: '', template: '', sensorMetric: '', metadata: null, drawingFile: null, manualMetadata: '' });

const assetTemplates = [
    { template: 'PV', id: 'PV-101', name: 'Pressure Vessel', type: 'Pressure Vessel', location: 'Unit 1' },
    { template: 'HE', id: 'HE-201', name: 'Heat Exchanger', type: 'Heat Exchanger', location: 'Unit 1' },
    { template: 'ST', id: 'ST-301', name: 'Storage Tank', type: 'Storage Tank', location: 'Tank Farm' },
    { template: 'PN', id: 'PN-401', name: 'Piping Network', type: 'Piping', location: 'Corridor' },
    { template: 'P', id: 'P-501', name: 'Pump', type: 'Rotating Equipment', location: 'Unit 2' },
    { template: 'M', id: 'M-601', name: 'Motor', type: 'Motor', location: 'Unit 2' },
    { template: 'C', id: 'C-701', name: 'Compressor', type: 'Compressor', location: 'Unit 3' },
];

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { createProject, currentProject } = useProject();
    const { session, loading: authLoading } = useAuth();

    const [step, setStep] = useState(1);
    const [projectData, setProjectData] = useState({
        name: '',
        industry: 'Refining',
        plant_name: '',
        role: 'Asset Integrity'
    });
    const [assets, setAssets] = useState([emptyAsset()]);
    const [fieldErrors, setFieldErrors] = useState({});
    const [activeAssetIndex, setActiveAssetIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({});
    const [savedAssetIds, setSavedAssetIds] = useState(new Set());

    useEffect(() => {
        const useDevAuth = import.meta.env.VITE_USE_DEV_AUTH === 'true';
        if (useDevAuth) return;
        if (!authLoading && !session) {
            navigate('/login');
        }
    }, [authLoading, session, navigate]);

    useEffect(() => {
        if (currentProject) {
            setStep(2);
        }
    }, [currentProject]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createProject({
                name: projectData.name,
                industry: projectData.industry,
                plant_name: projectData.plant_name,
                description: ''
            });
            setStep(2);
        } catch (err) {
            console.error(err);
            alert('Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    const addAsset = () => setAssets(prev => [...prev, emptyAsset()]);

    const updateAsset = (index, key, value) => {
        setAssets(prev => prev.map((a, i) => i === index ? { ...a, [key]: value } : a));
    };

    const suggestNextId = (baseId, existingIds) => {
        if (!baseId) return '';
        const match = baseId.match(/^([A-Z]+-)(\\d+)/);
        if (!match) return baseId;
        const prefix = match[1];
        let num = parseInt(match[2], 10);
        let candidate = `${prefix}${num}`;
        const set = new Set(existingIds);
        while (set.has(candidate)) {
            num += 1;
            candidate = `${prefix}${num}`;
        }
        return candidate;
    };

    const applyTemplate = (index, templateKey) => {
        const t = assetTemplates.find(x => x.template === templateKey);
        if (!t) return;
        const existingIds = assets.map(a => a.id);
        const suggestedId = suggestNextId(t.id, existingIds);
        setAssets(prev => prev.map((a, i) => i === index ? {
            ...a,
            template: t.template,
            id: suggestedId,
            name: t.name,
            type: t.type,
            location: t.location
        } : a));
    };

    const saveAsset = async (index) => {
        const asset = assets[index];
        if (!asset.id || !asset.name || !asset.type) {
            setFieldErrors(prev => ({ ...prev, [asset.id || `asset_${index}`]: 'Asset ID, name, and type are required' }));
            return false;
        }
        let metadata = null;
        if (asset.manualMetadata) {
            try {
                metadata = JSON.parse(asset.manualMetadata);
            } catch (err) {
                setFieldErrors(prev => ({ ...prev, [asset.id]: 'Manual metadata must be valid JSON' }));
                return false;
            }
        }
        try {
            const res = await AssetCreateService.create({
                id: asset.id,
                name: asset.name,
                type: asset.type,
                location: asset.location,
                project_id: currentProject?.id,
                metadata
            });
            setFieldErrors(prev => ({ ...prev, [asset.id]: '' }));
            setSavedAssetIds(prev => new Set([...prev, asset.id]));
            alert(`Asset ${asset.id} saved`);
            return true;
        } catch (err) {
            setFieldErrors(prev => ({ ...prev, [asset.id]: err.response?.data?.error || 'Failed to save asset' }));
            return false;
        }
    };

    const uploadFile = async (file, endpoint, extraParams = {}, onProgress) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { project_id: currentProject?.id, ...extraParams },
            onUploadProgress: (evt) => {
                if (!onProgress || !evt.total) return;
                const pct = Math.round((evt.loaded / evt.total) * 100);
                onProgress(pct);
            }
        });
        return response.data;
    };

    const handleAssetUpload = async (index, kind, file) => {
        const asset = assets[index];
        if (!asset.id) {
            setFieldErrors(prev => ({ ...prev, [asset.id || `asset_${index}`]: 'Set Asset ID before uploading' }));
            return;
        }
        if (!savedAssetIds.has(asset.id)) {
            const ok = await saveAsset(index);
            if (!ok) return;
        }
        if (kind === 'sensor' && !asset.sensorMetric) {
            setFieldErrors(prev => ({ ...prev, [asset.id]: 'Sensor metric required before uploading.' }));
            return;
        }
        let endpoint = '';
        let params = {};
        if (kind === 'drawing') {
            const safeName = file?.name || '';
            const safeType = (file?.type || '').toLowerCase();
            const isValidExt = /\.(pdf|png|jpg|jpeg)$/i.test(safeName);
            const isValidMime = ['application/pdf', 'image/png', 'image/jpeg'].includes(safeType);
            if (!isValidExt && !isValidMime) {
                setFieldErrors(prev => ({ ...prev, [asset.id]: 'Drawing must be PDF/PNG/JPG' }));
                return;
            }
            endpoint = '/ingest/analyze-image';
            params = { asset_id: asset.id };
        } else if (kind === 'sensor') {
            if (!file?.name?.match(/\\.csv$/i)) {
                setFieldErrors(prev => ({ ...prev, [asset.id]: 'Sensor file must be CSV' }));
                return;
            }
            endpoint = '/ingest/upload-sensor-data';
            params = { asset_id: asset.id, metric: asset.sensorMetric };
        } else if (kind === 'inspection') {
            if (!file?.name?.match(/\\.csv$/i)) {
                setFieldErrors(prev => ({ ...prev, [asset.id]: 'Inspection file must be CSV' }));
                return;
            }
            endpoint = '/ingest/upload-inspection-data';
            params = { asset_id: asset.id };
        }
        const key = `asset_${index}_${kind}`;
        setUploadStatus(prev => ({ ...prev, [key]: { status: 'Uploading...', progress: 0 } }));
        try {
            await uploadFile(file, endpoint, params, (pct) => {
                setUploadStatus(prev => ({ ...prev, [key]: { status: 'Uploading...', progress: pct } }));
            });
            if (kind === 'drawing') {
                try {
                    const metaRes = await api.get(`/assets/${asset.id}`);
                    const metadata = metaRes?.data?.asset?.metadata || null;
                    setAssets(prev => prev.map((a, i) => i === index ? { ...a, metadata } : a));
                } catch (err) {
                    // ignore metadata fetch errors, upload still counts
                }
            }
            setUploadStatus(prev => ({ ...prev, [key]: { status: 'Uploaded ✓', progress: 100 } }));
        } catch (err) {
            setUploadStatus(prev => ({ ...prev, [key]: { status: 'Failed ✕', progress: 0 } }));
            alert(err.response?.data?.error || 'Upload failed');
        }
    };

    const validAssets = assets.filter(a => a.id && a.name && a.type);
    const requiredKinds = ['drawing'];
    const totalRequired = validAssets.length * requiredKinds.length;
    const uploadedCount = validAssets.reduce((acc, a, idx) => {
        const base = requiredKinds.filter(k => uploadStatus[`asset_${idx}_${k}`]?.status === 'Uploaded ✓').length;
        return acc + base;
    }, 0);
    const completeness = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;
    const canProceed = totalRequired > 0 && uploadedCount === totalRequired;

    useEffect(() => {
        if (canProceed) {
            navigate('/dashboard');
        }
    }, [canProceed, navigate]);

    if (step === 1) {
        return (
            <div className="container py-12 max-w-3xl">
                <h1 className="text-4xl font-black uppercase mb-8">Create Project</h1>
                <form onSubmit={handleCreateProject} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-2">Project Name</label>
                        <input
                            className="w-full border-2 border-black p-3 font-mono"
                            value={projectData.name}
                            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-2">Plant / Unit</label>
                        <input
                            className="w-full border-2 border-black p-3 font-mono"
                            value={projectData.plant_name}
                            onChange={(e) => setProjectData({ ...projectData, plant_name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-2">Industry</label>
                        <select
                            className="w-full border-2 border-black p-3 font-mono"
                            value={projectData.industry}
                            onChange={(e) => setProjectData({ ...projectData, industry: e.target.value })}
                        >
                            <option value="Refining">Refining</option>
                            <option value="Chemical">Chemical</option>
                            <option value="Energy">Energy</option>
                        </select>
                    </div>
                    <button className="bg-black text-white py-4 px-6 font-bold uppercase" type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="container py-12">
            <div className="flex justify-between items-end mb-8 border-b-4 border-black pb-4">
                <div>
                    <h1 className="text-4xl font-black uppercase">Asset‑Wise Ingestion</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest">Add assets and upload data per asset</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    disabled={!canProceed}
                    className={`px-6 py-3 font-bold uppercase border-2 border-black ${canProceed ? 'bg-black text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                    Go to Dashboard
                </button>
            </div>

            <div className="box border-2 border-black p-4 mb-6 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                    <div className="font-bold uppercase text-sm">Asset Completeness</div>
                    <div className="font-bold">{completeness}%</div>
                </div>
                <div className="w-full h-4 border-2 border-black">
                    <div className="h-full bg-black" style={{ width: `${completeness}%` }}></div>
                </div>
                {!canProceed && (
                    <div className="text-xs font-mono text-gray-500 mt-2">
                        Upload all required files (drawing, sensor CSV, inspection CSV) for each asset to proceed.
                    </div>
                )}
            </div>

            <div className="flex gap-4 mb-6">
                {assets.map((a, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveAssetIndex(i)}
                        className={`px-4 py-2 border-2 border-black font-bold uppercase ${activeAssetIndex === i ? 'bg-black text-white' : 'bg-white'}`}
                    >
                        Asset {i + 1}
                    </button>
                ))}
                <button onClick={addAsset} className="px-4 py-2 border-2 border-black font-bold uppercase bg-yellow-400">
                    + Add Asset
                </button>
            </div>

            {assets.map((asset, index) => (
                index === activeAssetIndex && (
                    <div key={index} className="box border-2 border-black p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Asset Template</label>
                                <select
                                    className="w-full border-2 border-black p-3 font-mono"
                                    value={asset.template}
                                    onChange={(e) => applyTemplate(index, e.target.value)}
                                >
                                    <option value="">Select Template (auto-fill)</option>
                                    {assetTemplates.map(t => (
                                        <option key={t.template} value={t.template}>
                                            {t.template} — {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Asset ID</label>
                                <input
                                    className="w-full border-2 border-black p-3 font-mono"
                                    value={asset.id}
                                    onChange={(e) => updateAsset(index, 'id', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Asset Name</label>
                                <input
                                    className="w-full border-2 border-black p-3 font-mono"
                                    value={asset.name}
                                    onChange={(e) => updateAsset(index, 'name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Asset Type</label>
                                <input
                                    className="w-full border-2 border-black p-3 font-mono"
                                    placeholder="Pressure Vessel / Pump / Piping"
                                    value={asset.type}
                                    onChange={(e) => updateAsset(index, 'type', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Location</label>
                                <input
                                    className="w-full border-2 border-black p-3 font-mono"
                                    value={asset.location}
                                    onChange={(e) => updateAsset(index, 'location', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase mb-2">Manual Metadata (JSON)</label>
                                <textarea
                                    className="w-full border-2 border-black p-3 font-mono text-xs min-h-[90px]"
                                    placeholder='{"design_pressure":{"value":150,"unit":"psi"}}'
                                    value={asset.manualMetadata}
                                    onChange={(e) => updateAsset(index, 'manualMetadata', e.target.value)}
                                />
                            </div>
                        </div>

                        <button onClick={() => saveAsset(index)} className="bg-black text-white px-6 py-3 font-bold uppercase">
                            Save Asset
                        </button>
                        {fieldErrors[asset.id] && (
                            <div className="text-xs font-mono text-red-600 mt-2">{fieldErrors[asset.id]}</div>
                        )}

                        <div className="grid md:grid-cols-1 gap-4">
                            <div className="box border-2 border-black p-4">
                                <div className="font-bold uppercase text-sm mb-2">Engineering Drawing</div>
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="file"
                                        onChange={(e) => updateAsset(index, 'drawingFile', e.target.files?.[0] || null)}
                                    />
                                    <button
                                        className="bg-black text-white px-4 py-2 font-bold uppercase w-fit"
                                        onClick={() => handleAssetUpload(index, 'drawing', asset.drawingFile)}
                                    >
                                        Start Upload
                                    </button>
                                </div>
                                <div className="w-full h-2 border-2 border-black mt-2">
                                    <div className="h-full bg-black" style={{ width: `${uploadStatus[`asset_${index}_drawing`]?.progress || 0}%` }}></div>
                                </div>
                                <div className="text-xs font-mono mt-2">{uploadStatus[`asset_${index}_drawing`]?.status || 'Waiting'}</div>
                                {asset.metadata && (
                                    <div className="mt-4 border-t-2 border-black pt-3">
                                        <div className="text-xs font-bold uppercase mb-2">Extracted Drawing Metadata</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                            {Object.entries(asset.metadata)
                                                .filter(([key]) => key !== '_context')
                                                .map(([key, val]) => {
                                                    const label = key.replace(/_/g, ' ').toUpperCase();
                                                    const display = (val && typeof val === 'object' && val.value !== undefined)
                                                        ? `${val.value}${val.unit ? ` ${val.unit}` : ''}`
                                                        : `${val}`;
                                                    return (
                                                        <div key={key} className="flex items-center justify-between border border-black px-2 py-1">
                                                            <span className="uppercase">{label}</span>
                                                            <span className="font-bold">{display}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                        {asset.metadata._context && (
                                            <div className="text-[10px] font-mono text-gray-600 mt-2">
                                                Source: {asset.metadata._context.source || 'unknown'} · {asset.metadata._context.extracted_at || 'N/A'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

export default OnboardingPage;
