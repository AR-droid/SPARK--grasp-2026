import React from 'react';

const ReportModal = ({ isOpen, onClose, assetId }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white border-4 border-black shadow-[8px_8px_0px_0px_white]">
                <div className="bg-black text-white p-4 flex justify-between items-center">
                    <h2 className="font-black uppercase tracking-wider">Generate Compliance Report</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-300 font-bold">&times;</button>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="block font-bold uppercase text-sm mb-2">Report Type</label>
                        <select className="w-full border-2 border-black p-3 font-mono font-bold">
                            <option>Full Safety Assessment (ISO-14224)</option>
                            <option>Maintenance Work Order</option>
                            <option>Executive Summary</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-bold uppercase text-sm mb-2">Include Sections</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" defaultChecked className="w-5 h-5 border-2 border-black accent-black" />
                                <span className="font-mono text-sm">AI Risk Justification</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" defaultChecked className="w-5 h-5 border-2 border-black accent-black" />
                                <span className="font-mono text-sm">Degradation Trends (Last 6mo)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 border-2 border-black accent-black" />
                                <span className="font-mono text-sm">Raw Sensor Logs</span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border-2 border-yellow-400 p-4 text-sm font-mono">
                        <strong>NOTE:</strong> This report will be logged in the immutable audit trail for Asset {assetId}.
                    </div>
                </div>

                <div className="p-4 border-t-4 border-black bg-gray-50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 border-2 border-black font-bold hover:bg-gray-100">
                        CANCEL
                    </button>
                    <button className="flex-1 py-3 bg-red-600 text-white border-2 border-black hover:bg-red-700 shadow-[4px_4px_0px_0px_black]">
                        GENERATE PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
