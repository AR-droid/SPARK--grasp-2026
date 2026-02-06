import React from 'react';

const ExplainabilityDrawer = ({ isOpen, onClose, data }) => {
    if (!isOpen) return null;

    const features = [
        { name: 'Vibration Drift', weight: 85, value: '4.1 mm/s' },
        { name: 'Corrosion Rate', weight: 65, value: '0.5 mm/yr' },
        { name: 'Op. Temperature', weight: 30, value: '455°C' },
        { name: 'Pressure Cycles', weight: 15, value: 'Normal' },
    ];

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

                    {/* Confidence Block */}
                    <div className="box border-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold uppercase text-sm">Model Confidence</span>
                            <span className="font-black text-xl">87%</span>
                        </div>
                        <div className="w-full h-4 border-2 border-black p-0.5">
                            <div className="h-full bg-black w-[87%]"></div>
                        </div>
                    </div>

                    {/* Feature Attribution */}
                    <div>
                        <h3 className="font-bold uppercase border-b-2 border-black mb-4 pb-2">Top Contributing Factors</h3>
                        <div className="space-y-4">
                            {features.map((feature, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm font-mono font-bold mb-1">
                                        <span>{feature.name}</span>
                                        <span>{feature.value}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-grow h-6 bg-gray-100 border-2 border-black relative">
                                            <div
                                                className="h-full bg-red-500 absolute top-0 left-0"
                                                style={{ width: `${feature.weight}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold w-8 text-right">{feature.weight}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logic Trace */}
                    <div className="bg-blue-50 border-2 border-black p-4">
                        <h3 className="font-bold uppercase text-sm mb-2 text-blue-800">Rule Trace #42</h3>
                        <p className="font-mono text-sm">
                            IF <span className="font-bold bg-white px-1">Vibration &gt; 3.5</span><br />
                            AND <span className="font-bold bg-white px-1">Corrosion &gt; 0.3</span><br />
                            THEN <span className="font-bold bg-red-600 text-white px-1">RISK = HIGH</span>
                        </p>
                    </div>
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
