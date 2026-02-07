import React, { useState, useEffect } from 'react';
import { ActionService, ReportService } from '../services/api';
import { useProject } from '../context/ProjectContext';

const ActionCenter = () => {
    const { currentProject } = useProject();
    const [tasks, setTasks] = useState([]);

    // Mock fetching "Actionable" items
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const actions = await ActionService.list(currentProject?.id, 'OPEN');
                setTasks(actions);
            } catch (err) {
                console.error(err);
            }
        };
        fetchTasks();
    }, [currentProject]);

    const handleAction = (actionItem, action) => {
        if (!actionItem) return;
        ActionService.approve(actionItem.id, action).then(() => {
            setTasks(prev => prev.filter(t => t.id !== actionItem.id));
        });
    };

    const handleGenerateReport = () => {
        if (!tasks[0]) return;
        ReportService.downloadAssetReport(tasks[0].asset_id).then((blob) => {
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `SPARK_Report_${tasks[0].asset_id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        });
    };

    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <div>
                    <h1 className="text-4xl font-black uppercase">Action Center</h1>
                    <p className="text-gray-500 font-bold">Pending Maintenance Decisions: {tasks.length}</p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    className="bg-black text-white px-6 py-3 font-bold uppercase hover:bg-gray-800"
                >
                    📄 Generate Regulatory Report
                </button>
            </div>

            <div className="grid gap-6">
                {tasks.length === 0 ? (
                    <div className="p-12 text-center bg-green-50 border-2 border-green-200">
                        <div className="text-4xl mb-2">✅</div>
                        <h3 className="text-xl font-bold text-green-800">No Critical Actions Pending</h3>
                        <p className="text-green-600">All systems operating within safety parameters.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="box bg-white border-2 border-black flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 text-xs font-bold text-white ${task.recommendation === 'REPAIR' ? 'bg-red-600' : 'bg-yellow-500'}`}>
                                        {task.recommendation}
                                    </span>
                                    <h3 className="font-black text-xl">{task.asset_id}</h3>
                                </div>
                                <p className="text-sm font-mono text-gray-600 mb-2">
                                    Status: <span className="font-bold text-black">{task.status}</span>
                                </p>
                                <div className="bg-gray-100 p-2 text-xs border-l-2 border-black">
                                    Recommended: {task.recommendation}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAction(task, 'REPAIR')}
                                    className="px-6 py-3 bg-red-600 text-white font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_black] hover:translate-y-1 hover:shadow-none transition-all"
                                >
                                    Repair
                                </button>
                                <button
                                    onClick={() => handleAction(task, 'MONITOR')}
                                    className="px-6 py-3 bg-yellow-400 text-black font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_black] hover:translate-y-1 hover:shadow-none transition-all"
                                >
                                    Monitor
                                </button>
                                <button
                                    onClick={() => handleAction(task, 'DEFER')}
                                    className="px-6 py-3 bg-white text-gray-400 font-bold uppercase border-2 border-gray-300 hover:text-black hover:border-black transition-colors"
                                >
                                    Defer
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ActionCenter;
