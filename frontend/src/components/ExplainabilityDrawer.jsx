import React, { useEffect, useState } from 'react';
import { AnalysisService } from '../services/api';

const ExplainabilityDrawer = ({ isOpen, onClose, data, confidence, assetId, projectId }) => {
    if (!isOpen) return null;

    const drivers = data?.rof_drivers || [];
    const cofDrivers = data?.cof_drivers || [];
    const failureModes = data?.failure_mode_candidates || [];
    const assumptions = data?.assumptions || [];
    const signalWeights = data?.signal_weights || null;
    const confidencePct = confidence ? Math.round(confidence * 100) : 0;
    const [tab, setTab] = useState('reasoning');
    const [lcaData, setLcaData] = useState({ costs: [], impacts: [] });

    useEffect(() => {
        if (!isOpen) return;
        AnalysisService.getLcaSummary().then(setLcaData).catch(() => {});
    }, [isOpen]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

            {/* Drawer Panel */}
            <div className="relative w-full max-w-md bg-white border-l-4 border-black h-full shadow-[-10px_0px_0px_0px_rgba(0,0,0,0.5)] flex flex-col">

                {/* Header */}
                <div className="bg-yellow-400 p-6 border-b-4 border-black flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black uppercase mb-1">AI Reasoning</h2>
                        <p className="font-mono text-sm font-bold">Why was this asset flagged?</p>
                    </div>
                    <button onClick={onClose} className="bg-black text-white px-3 py-1 text-xl font-bold hover:bg-gray-800">
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-grow overflow-y-auto space-y-8">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        {[
                            { id: 'reasoning', label: 'Reasoning' },
                            { id: 'agentic', label: 'Agentic AI' },
                            { id: 'lca', label: 'LCA' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`px-3 py-1 border-2 border-black text-xs font-bold uppercase ${tab === t.id ? 'bg-black text-white' : 'bg-white'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'reasoning' && (
                        <>
                            <div className="box border-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold uppercase text-sm">Model Confidence</span>
                                    <span className="font-black text-xl">{confidencePct}%</span>
                                </div>
                                <div className="w-full h-4 border-2 border-black p-0.5">
                                    <div className="h-full bg-black" style={{ width: `${confidencePct}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold uppercase border-b-2 border-black mb-4 pb-2">Top Contributing Factors</h3>
                                <div className="space-y-4">
                                    {drivers.length > 0 ? (
                                        drivers.map((driver, idx) => (
                                            <div key={idx} className="text-sm font-mono font-bold">
                                                {driver}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500">No explainability data available.</div>
                                    )}
                                </div>
                            </div>

                            {signalWeights && (
                                <div>
                                    <h3 className="font-bold uppercase border-b-2 border-black mb-4 pb-2">Signal Weights</h3>
                                    <div className="space-y-3">
                                        {Object.entries(signalWeights).map(([signal, weight]) => (
                                            <div key={signal}>
                                                <div className="flex justify-between text-sm font-mono font-bold mb-1">
                                                    <span>{signal}</span>
                                                    <span>{Math.round(weight * 100)}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-grow h-4 bg-gray-100 border-2 border-black relative">
                                                        <div
                                                            className="h-full bg-red-500 absolute top-0 left-0"
                                                            style={{ width: `${Math.round(weight * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 border-2 border-black p-4 space-y-2">
                                <h3 className="font-bold uppercase text-sm text-blue-800">Failure Modes</h3>
                                {failureModes.length > 0 ? (
                                    <ul className="list-disc pl-4 text-sm font-mono space-y-1">
                                        {failureModes.map((mode, idx) => (
                                            <li key={idx}>{mode}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-sm text-gray-500">No failure mode candidates identified.</div>
                                )}
                                <h3 className="font-bold uppercase text-sm text-blue-800 pt-2">CoF Drivers</h3>
                                {cofDrivers.length > 0 ? (
                                    <ul className="list-disc pl-4 text-sm font-mono space-y-1">
                                        {cofDrivers.map((driver, idx) => (
                                            <li key={idx}>{driver}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-sm text-gray-500">No CoF drivers identified.</div>
                                )}
                                <h3 className="font-bold uppercase text-sm text-blue-800 pt-2">Assumptions</h3>
                                {assumptions.length > 0 ? (
                                    <ul className="list-disc pl-4 text-sm font-mono space-y-1">
                                        {assumptions.map((assumption, idx) => (
                                            <li key={idx}>{assumption}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-sm text-gray-500">No assumptions listed.</div>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'agentic' && (
                        <div className="space-y-4">
                            <div className="text-xs font-mono uppercase">SPARK Agent Explainability Framework (Rule-Based)</div>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    {
                                        title: 'Asset Context Interpreter',
                                        desc: 'Maps P&ID + asset graph + critical zones.',
                                        inputs: 'P&ID drawings, asset graph, twin geometry, stress zones',
                                        logic: 'Tags boundaries, roles, stress/inspection zones',
                                        meaning: 'Signals are localized to critical zones',
                                        confidence: 'High',
                                        assumptions: 'P&ID current; no undocumented bypass'
                                    },
                                    {
                                        title: 'Signal Fusion Reasoner',
                                        desc: 'Correlates pressure, vibration, inspection & audio.',
                                        inputs: 'Time-series, audio, inspection, baselines',
                                        logic: 'Aligns signals, rejects isolated anomalies',
                                        meaning: 'Multi-signal agreement reduces false alarms',
                                        confidence: 'Medium–High',
                                        assumptions: 'Sensors synchronized; inspections recent'
                                    },
                                    {
                                        title: 'Failure Timeline Builder',
                                        desc: 'Projects degradation → threshold → failure window.',
                                        inputs: 'Degradation rates, limits, thresholds',
                                        logic: 'Extrapolates trend to time-to-threshold',
                                        meaning: 'Supports planned shutdown and safe life extension',
                                        confidence: 'Medium',
                                        assumptions: 'Operating conditions stable'
                                    },
                                    {
                                        title: 'Risk Propagation Agent',
                                        desc: 'Simulates domino effects across connected assets.',
                                        inputs: 'Connectivity graph, failure modes, COF weights',
                                        logic: 'Traces downstream impacts and recalculates risk',
                                        meaning: 'Shifts focus from asset health to system safety',
                                        confidence: 'Medium',
                                        assumptions: 'Graph complete; no manual intervention'
                                    }
                                ].map((a, idx) => (
                                    <div key={idx} className="border-2 border-black p-4 bg-gray-50">
                                        <div className="font-bold uppercase text-xs mb-1">AI Agent</div>
                                        <div className="font-black">{a.title}</div>
                                        <div className="text-xs font-mono mt-1 text-gray-600">{a.desc}</div>
                                        <div className="mt-3 text-xs font-mono space-y-1">
                                            <div><span className="font-bold">What I looked at:</span> {a.inputs}</div>
                                            <div><span className="font-bold">What I did:</span> {a.logic}</div>
                                            <div><span className="font-bold">Why it matters:</span> {a.meaning}</div>
                                            <div><span className="font-bold">Confidence:</span> {a.confidence}</div>
                                            <div><span className="font-bold">Assumptions:</span> {a.assumptions}</div>
                                        </div>
                                        <div className="mt-2 text-[10px] font-mono text-green-700">Ready to run</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'lca' && (
                        <div className="space-y-4">
                            <div className="text-xs font-mono uppercase">Life Cycle Assessment</div>
                            <div className="border-2 border-black p-3">
                                <div className="font-bold uppercase text-xs mb-2">Cost (USD)</div>
                                {lcaData.costs.length > 0 ? (
                                    lcaData.costs.map((c, idx) => (
                                        <div key={idx} className="flex justify-between text-xs font-mono">
                                            <span>{c.action}</span>
                                            <span>${c.cost_usd}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-gray-500">No cost data.</div>
                                )}
                            </div>
                            <div className="border-2 border-black p-3">
                                <div className="font-bold uppercase text-xs mb-2">CO₂ Impact (kg)</div>
                                {lcaData.impacts.length > 0 ? (
                                    lcaData.impacts.map((c, idx) => (
                                        <div key={idx} className="flex justify-between text-xs font-mono">
                                            <span>{c.action}</span>
                                            <span>{c.co2_kg} kg</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-gray-500">No impact data.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t-4 border-black bg-gray-50">
                    <button className="w-full py-3 bg-black text-white hover:bg-gray-800 font-bold uppercase">
                        Download Technical Log
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExplainabilityDrawer;
