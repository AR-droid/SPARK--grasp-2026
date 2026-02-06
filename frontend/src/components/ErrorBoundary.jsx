import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', backgroundColor: '#fff0f0', border: '5px solid red', color: 'black', fontFamily: 'monospace', margin: '20px' }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '20px', textTransform: 'uppercase', fontWeight: 'bold' }}>⚠️ Application Crashed</h1>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {this.state.error && this.state.error.toString()}
                    </div>
                    <details style={{ whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
                        <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>View Trace</summary>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
