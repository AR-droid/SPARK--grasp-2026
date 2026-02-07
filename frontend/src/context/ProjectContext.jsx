import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProjectService } from '../services/api';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
    const [currentProject, setCurrentProject] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'Asset Integrity', 'Maintenance', 'Safety'
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load projects on startup
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await ProjectService.getAll();
            setProjects(data);
            // Default to first project if available and none selected
            if (data.length > 0 && !currentProject) {
                setCurrentProject(data[0]);
            }
        } catch (err) {
            console.error("Failed to load projects", err);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async (projectData) => {
        try {
            const newProject = await ProjectService.create(projectData);
            setProjects(prev => [newProject, ...prev]);
            setCurrentProject(newProject);
            return newProject;
        } catch (err) {
            throw err;
        }
    };

    const switchProject = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setCurrentProject(project);
        }
    };

    const value = {
        currentProject,
        userRole,
        setUserRole,
        projects,
        createProject,
        switchProject,
        loading
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};
