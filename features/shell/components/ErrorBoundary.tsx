"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional label to help identify which region failed in logs. */
  region?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Catches render/lifecycle errors in the wrapped subtree so a single broken view
 * shows a recoverable message instead of blanking the whole shell. Logs to the
 * console for now — wire to Crashlytics once it is set up.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.region ? `:${this.props.region}` : ""}]`, error, info.componentStack);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src="/icon-192.png" alt="Kelunia" />
        </div>
        <h1>Ceva nu a mers</h1>
        <p>Pagina a întâmpinat o eroare neașteptată. Reîncarcă pentru a continua.</p>
        <button className="primary-button" onClick={this.handleReload} type="button">
          Reîncarcă
        </button>
      </div>
    );
  }
}
