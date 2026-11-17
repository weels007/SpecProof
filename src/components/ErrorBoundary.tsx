import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SpecProof crashed', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <span className="crash-mark" aria-hidden="true">
            !
          </span>
          <h1>Something broke.</h1>
          <p>
            The workspace hit an unexpected error. Drafts stay in this browser, so reloading is
            safe.
          </p>
          <pre className="crash-detail">{error.message}</pre>
          <button className="button button-primary" type="button" onClick={this.handleReload}>
            Reload SpecProof
          </button>
        </div>
      </div>
    );
  }
}
