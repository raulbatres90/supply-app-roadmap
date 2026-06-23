import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#b91c1c', background: '#fef2f2', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 12, fontSize: 16 }}>🔥 React error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'white', padding: 12, borderRadius: 6, border: '1px solid #fecaca' }}>
            <strong>{this.state.error.toString()}</strong>
            {'\n\n'}
            {this.state.error.stack}
            {this.state.info?.componentStack && '\n\nComponent stack:' + this.state.info.componentStack}
          </pre>
          <button onClick={() => this.setState({ error: null, info: null })} style={{ marginTop: 12, padding: '6px 12px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
