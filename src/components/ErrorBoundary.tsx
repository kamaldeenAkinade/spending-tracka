import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  handleReset = () => {
    localStorage.removeItem('receipts_expenses');
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <p className="error-boundary-title">Something went wrong loading the app.</p>
          <p className="error-boundary-sub">This is usually caused by corrupt saved data.</p>
          <button className="btn-primary error-boundary-btn" onClick={this.handleReset}>
            Clear data and reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
