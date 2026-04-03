import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Ignore known extension/tooling noise that can break the Vite overlay.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = String(event?.message || '');
    if (msg.includes('mgt.clearMarks is not a function')) {
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonText = String(event?.reason?.message || event?.reason || '');
    if (reasonText.includes('mgt.clearMarks is not a function')) {
      event.preventDefault();
    }
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('React Error:', error, info); }
  render() {
    if (this.state.error) {
      return <div style={{padding:40,color:'red',fontSize:18}}>
        <h1>Something went wrong</h1>
        <pre>{this.state.error.message}</pre>
        <pre>{this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
