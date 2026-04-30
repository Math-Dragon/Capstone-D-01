import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const errorPayload = {
      message: error?.message || error?.toString?.() || 'Unknown error',
      stack: error?.stack || null,
      componentStack: errorInfo?.componentStack || null,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
    console.error('[ErrorBoundary]', errorPayload);
    if (typeof this.props.onError === 'function') {
      this.props.onError(errorPayload);
    }
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback || (
        <div className="error-boundary" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Terjadi kesalahan</h2>
          <p>{this.props.message || 'Coba muat ulang halaman ini.'}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Muat ulang
          </button>
        </div>
      );
      return fallback;
    }
    return this.props.children;
  }
}
