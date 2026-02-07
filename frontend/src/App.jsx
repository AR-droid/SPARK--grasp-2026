import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AssetDetails from './pages/AssetDetails';
import ActionCenter from './pages/ActionCenter';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider } from './context/AuthContext';
import OnboardingPage from './pages/OnboardingPage';
import ProjectSelectPage from './pages/ProjectSelectPage';

function App() {
    return (
        <AuthProvider>
            <ProjectProvider>
                <Router>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/signup" element={<SignupPage />} />
                            <Route path="/projects" element={<ProjectSelectPage />} />
                            <Route path="/onboarding" element={<OnboardingPage />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/actions" element={<ActionCenter />} />
                            <Route path="/asset/:id" element={<AssetDetails />} />
                        </Routes>
                    </Layout>
                </Router>
            </ProjectProvider>
        </AuthProvider>
    );
}

export default App;
