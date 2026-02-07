import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';

const OnboardingModal = ({ isOpen, onClose }) => {
    const { createProject, setUserRole } = useProject();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        industry: 'Refining', // Default
        plant_name: '',
        role: 'Asset Integrity'
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.industry) {
            alert("Please fill in required fields");
            return;
        }

        setLoading(true);
        try {
            await createProject({
                name: formData.name,
                industry: formData.industry,
                plant_name: formData.plant_name,
                description: ''
            });
            setUserRole(formData.role);

            // Close modal (Dashboard will now re-render with this empty project)
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-2xl border-4 border-black shadow-[8px_8px_0px_0px_white]">
                <div className="bg-black text-white p-6">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">
                        Setup New Workspace
                    </h2>
                </div>

                <form onSubmit={handleCreateProject} className="p-8 space-y-6">
                    {/* Step Indicator */}
                    <div className="flex gap-2 mb-8">
                        <div className={`h-2 flex-1 ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`}></div>
                        <div className={`h-2 flex-1 ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`}></div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-xl font-bold uppercase">1. Select Your Role</h3>
                            <p className="text-sm text-gray-500 mb-4">Accountability starts here. Who is responsible for this asset?</p>

                            <div>
                                <select
                                    className="w-full border-2 border-black p-3 font-mono outline-none focus:bg-yellow-50"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="Asset Integrity">Asset Integrity Engineer</option>
                                    <option value="Maintenance">Maintenance Engineer</option>
                                    <option value="Safety">Safety Officer</option>
                                </select>
                            </div>

                            <div className="p-4 bg-yellow-400 border-2 border-black mt-4">
                                <p className="font-bold text-sm uppercase mb-2">⚠ Accountability Check</p>
                                <p className="text-sm">Asset integrity decisions must be traceable to people, not just models.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="w-full bg-black text-white py-4 font-bold uppercase hover:bg-gray-800 transition-colors mt-8"
                            >
                                Next: Define Project &rarr;
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-xl font-bold uppercase">2. Project Context</h3>

                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Plant / Unit Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-50 outline-none"
                                    placeholder="e.g. Unit 01 - Crude Distillation"
                                    value={formData.plant_name}
                                    onChange={e => setFormData({ ...formData, plant_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-50 outline-none"
                                    placeholder="e.g. SPARK Scaled Pilot"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Industry Context</label>
                                <select
                                    className="w-full border-2 border-black p-3 font-mono outline-none"
                                    value={formData.industry}
                                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                >
                                    <option value="Refining">Refining (Downstream)</option>
                                    <option value="Chemical">Chemical Processing</option>
                                    <option value="Energy">Energy / Power Gen</option>
                                </select>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 border-2 border-black py-4 font-bold uppercase hover:bg-gray-100"
                                >
                                    &larr; Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-black text-white py-4 font-bold uppercase hover:bg-gray-800 transition-colors"
                                >
                                    {loading ? 'Establish Context...' : 'Initialize Registry'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default OnboardingModal;
