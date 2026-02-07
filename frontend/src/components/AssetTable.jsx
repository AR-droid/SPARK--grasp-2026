import React from 'react';

export const RiskBadge = ({ level }) => {
    const config = {
        High: { bg: 'bg-red-600', text: 'text-white', shape: 'rounded-full' }, // Cirlce
        Medium: { bg: 'bg-yellow-400', text: 'text-black', shape: '' }, // Square
        Low: { bg: 'bg-green-600', text: 'text-white', shape: 'clip-triangle' } // Triangleish
    };

    const style = config[level] || config.Low;

    return (
        <span className={`inline-flex items-center gap-2 border-2 border-black px-3 py-1 font-bold text-xs uppercase ${style.bg} ${style.text}`}>
            {level === 'High' && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
            {level} RISK
        </span>
    );
};

export const AssetTable = ({ assets = [] }) => {

    return (
        <div className="box w-full overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black uppercase">Asset Inventory</h3>
                <div className="flex gap-2">
                    <button className="px-4 py-1 text-xs bg-black text-white hover:bg-gray-800">Export CSV</button>
                    <button className="px-4 py-1 text-xs hover:bg-gray-100">Filter</button>
                </div>
            </div>

            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b-4 border-black">
                        <th className="p-4 uppercase font-bold text-sm">Select</th>
                        <th className="p-4 uppercase font-bold text-sm">Asset ID</th>
                        <th className="p-4 uppercase font-bold text-sm">Type</th>
                        <th className="p-4 uppercase font-bold text-sm">Risk Level</th>
                        <th className="p-4 uppercase font-bold text-sm">Status</th>
                        <th className="p-4 uppercase font-bold text-sm text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset, index) => (
                        <tr key={asset.id} className="border-b-2 border-black hover:bg-blue-50">
                            <td className="p-4">
                                <input type="checkbox" className="w-5 h-5 border-2 border-black accent-black" />
                            </td>
                            <td className="p-4 font-mono font-bold">{asset.id}</td>
                            <td className="p-4 font-mono text-sm">{asset.type}</td>
                            <td className="p-4">
                                <td className="p-4">
                                    <RiskBadge level={asset.risk_level} />
                                </td>
                            </td>
                            <td className="p-4 font-bold text-sm uppercase">
                                {asset.risk_level === 'High' ? 'Critical' : 'Stable'}
                            </td>
                            <td className="p-4 text-right">
                                <a href={`/asset/${asset.id}`}>
                                    <button className="px-4 py-1 text-xs bg-white hover:bg-black hover:text-white transition-colors shadow-none border-2">
                                        VIEW &rarr;
                                    </button>
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
