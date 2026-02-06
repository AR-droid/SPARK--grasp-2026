import React from 'react';

const KpiCard = ({ title, value, icon, color }) => {
    // Color mapping for the corner accents
    const colorClasses = {
        red: 'border-t-red-500',
        yellow: 'border-t-yellow-400',
        blue: 'border-t-blue-600',
        gray: 'border-t-gray-400'
    };

    return (
        <div className="box relative min-h-[160px] flex flex-col justify-between">
            {/* Corner Accent */}
            <div className={`absolute top-0 right-0 w-0 h-0 border-l-[40px] border-t-[40px] border-l-transparent ${colorClasses[color] || 'border-t-black'}`}></div>

            <div className="flex items-start gap-3">
                {/* Icon placeholder (using geometric shapes for dusty style) */}
                <div className="border-2 border-black p-1 w-8 h-8 flex items-center justify-center">
                    {icon}
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
            </div>

            <div className="mt-4">
                <span className="text-5xl font-black block tracking-tighter">{value}</span>
            </div>
        </div>
    );
};

export default KpiCard;
