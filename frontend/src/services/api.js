import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    let token = null;
    if (import.meta.env.VITE_USE_DEV_AUTH === 'true') {
        token = localStorage.getItem('dev_token');
    } else {
        const { data } = await import('./supabase.js').then(mod => mod.supabase.auth.getSession());
        token = data?.session?.access_token;
    }
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Project Service
export const ProjectService = {
    getAll: async () => {
        const response = await api.get('/projects/');
        return response.data;
    },
    create: async (projectData) => {
        const response = await api.post('/projects/', projectData);
        return response.data;
    },
    getDetails: async (id) => {
        const response = await api.get(`/projects/${id}`);
        return response.data;
    }
};

// Asset Service
export const AssetService = {
    getAllAssets: async (projectId) => {
        const response = await api.get(`/assets/?project_id=${projectId || ''}`);
        return response.data;
    },

    getAssetDetails: async (id) => {
        const response = await api.get(`/assets/${id}`);
        return response.data;
    },

    runDiagnosis: async (assetId, assetType, recentData) => {
        const response = await api.post('/analysis/run_diagnosis', {
            asset_id: assetId,
            asset_type: assetType,
            sensor_data: recentData
        });
        return response.data;
    }
};

export const AssetCreateService = {
    create: async (asset) => {
        const response = await api.post('/assets/', asset);
        return response.data;
    }
};

export const AnalysisService = {
    getAssetSummary: async (assetId, projectId) => {
        const response = await api.get(`/analysis/asset-summary/${assetId}`, {
            params: { project_id: projectId }
        });
        return response.data;
    },
    getLcaSummary: async () => {
        const response = await api.get('/analysis/lca_summary');
        return response.data;
    }
};

export const ActionService = {
    list: async (projectId, status) => {
        const response = await api.get('/actions/', {
            params: { project_id: projectId, status }
        });
        return response.data;
    },
    listByAsset: async (assetId) => {
        const response = await api.get('/actions/', {
            params: { asset_id: assetId }
        });
        return response.data;
    },
    approve: async (actionId, approvedAction, approvedBy = 'Engineer') => {
        const response = await api.post(`/actions/${actionId}/approve`, {
            approved_action: approvedAction,
            approved_by: approvedBy,
            status: 'APPROVED'
        });
        return response.data;
    }
};

export const ReportService = {
    downloadAssetReport: async (assetId) => {
        const response = await api.get(`/reports/asset/${assetId}`, { responseType: 'blob' });
        return response.data;
    }
};
