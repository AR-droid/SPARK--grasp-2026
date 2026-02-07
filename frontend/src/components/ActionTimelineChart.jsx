import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const STATUS_SCORE = {
    OPEN: 1,
    APPROVED: 2,
    COMPLETED: 3,
    REJECTED: 0
};

const ActionTimelineChart = ({ actions }) => {
    if (!actions || actions.length === 0) return null;

    const sorted = [...actions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const labels = sorted.map(a => new Date(a.created_at).toLocaleDateString());
    const values = sorted.map(a => STATUS_SCORE[a.status] ?? 1);

    const data = {
        labels,
        datasets: [
            {
                label: 'Action Status Timeline',
                data: values,
                borderColor: '#111827',
                backgroundColor: '#111827',
                tension: 0,
                pointRadius: 5,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#111827',
                pointBorderWidth: 2,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const action = sorted[ctx.dataIndex];
                        return `${action.recommendation} — ${action.status}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#111' }
            },
            y: {
                min: 0,
                max: 3,
                ticks: {
                    stepSize: 1,
                    callback: (val) => {
                        const map = {0: 'Rejected', 1: 'Open', 2: 'Approved', 3: 'Completed'};
                        return map[val] || '';
                    }
                },
                grid: { color: '#e5e5e5' }
            }
        }
    };

    return (
        <div className="box h-full">
            <h4 className="font-bold uppercase text-sm mb-4 border-b-2 border-black pb-2">
                Action Timeline
            </h4>
            <div className="h-[200px]">
                <Line options={options} data={data} />
            </div>
        </div>
    );
};

export default ActionTimelineChart;
