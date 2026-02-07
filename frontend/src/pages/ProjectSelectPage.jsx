import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

const ProjectSelectPage = () => {
    const navigate = useNavigate();
    const { projects, switchProject, currentProject, loading } = useProject();
    const { session, loading: authLoading } = useAuth();

    useEffect(() => {
        const useDevAuth = import.meta.env.VITE_USE_DEV_AUTH === 'true';
        if (useDevAuth) return;
        if (!authLoading && !session) {
            navigate('/login');
        }
    }, [authLoading, session, navigate]);

    useEffect(() => {
        if (!loading && projects.length === 0) {
            navigate('/onboarding');
        }
    }, [loading, projects, navigate]);

    return (
        <div className="container py-12">
            <div className="flex justify-between items-end mb-8 border-b-4 border-black pb-4">
                <div>
                    <h1 className="text-4xl font-black uppercase">Select Project</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest">Choose context before analysis</p>
                </div>
                <button
                    onClick={() => navigate('/onboarding')}
                    className="bg-black text-white px-6 py-3 font-bold uppercase hover:bg-gray-800"
                >
                    + New Project
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {projects.map((p) => (
                    <div key={p.id} className="box border-2 border-black bg-white p-6 flex flex-col gap-2">
                        <div className="font-black text-xl">{p.name}</div>
                        <div className="text-xs font-bold uppercase text-gray-500">{p.industry}</div>
                        <div className="text-sm font-mono">Plant: {p.plant_name}</div>
                        <button
                            onClick={() => {
                                switchProject(p.id);
                                navigate('/dashboard');
                            }}
                            className="mt-4 bg-yellow-400 border-2 border-black font-bold uppercase py-2"
                        >
                            Use Project
                        </button>
                    </div>
                ))}
            </div>

            {projects.length === 0 && (
                <div className="mt-8 text-center font-mono text-gray-500">No projects yet. Create one to begin.</div>
            )}

            {currentProject && (
                <div className="mt-8 text-xs font-mono">Active: {currentProject.name}</div>
            )}
        </div>
    );
};

export default ProjectSelectPage;
