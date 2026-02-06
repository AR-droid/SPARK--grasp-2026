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

const TrendChart = ({ title, data, color = 'black' }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: true,
                    borderColor: 'black',
                    borderWidth: 2,
                },
                ticks: {
                    font: { family: 'Courier New', weight: 'bold' },
                    color: 'black'
                }
            },
            y: {
                grid: {
                    color: '#e5e5e5',
                    drawBorder: true,
                    borderColor: 'black',
                    borderWidth: 2,
                },
                ticks: {
                    font: { family: 'Courier New', weight: 'bold' },
                    color: 'black'
                }
            }
        },
        elements: {
            line: {
                tension: 0, // No curves, strictly industrial
                borderWidth: 3,
                borderColor: color,
            },
            point: {
                radius: 4,
                backgroundColor: 'white',
                borderColor: 'black',
                borderWidth: 2,
                hoverRadius: 6,
            }
        }
    };

    const chartData = {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        datasets: [
            {
                label: title,
                data: data,
                borderColor: color,
                backgroundColor: color,
            },
        ],
    };

    return (
        <div className="box h-full">
            <h4 className="font-bold uppercase text-sm mb-4 border-b-2 border-black pb-2 flex justify-between">
                {title}
                <span className="bg-black text-white px-1 text-xs">LIVE</span>
            </h4>
            <div className="h-[200px]">
                <Line options={options} data={chartData} />
            </div>
        </div>
    );
};

export default TrendChart;
