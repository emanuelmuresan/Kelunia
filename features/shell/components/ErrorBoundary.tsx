"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ReportProblemModal } from "@/features/shell/components/ReportProblemModal";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional label to help identify which region failed in logs. */
  region?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
  componentStack: string;
  reportOpen: boolean;
};

/**
 * Catches render/lifecycle errors in the wrapped subtree so a single broken view
 * shows a recoverable message instead of blanking the whole shell. Offers a
 * "report" form that files the error (plus a note) to the owner's errorReports.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "", componentStack: "", reportOpen: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, message: error?.message ?? String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? "" });
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
      <>
        <div className="loading-screen">
          <div className="loading-logo">
            <img src="/icon-192.png" alt="Kelunia" />
          </div>
          <h1>Ceva nu a mers</h1>
          <p>Pagina a întâmpinat o eroare neașteptată. Reîncarcă pentru a continua.</p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => this.setState({ reportOpen: true })} type="button">
              Raportează problema
            </button>
            <button className="primary-button" onClick={this.handleReload} type="button">
              Reîncarcă
            </button>
          </div>
        </div>

        <ReportProblemModal
          open={this.state.reportOpen}
          errorContext={{ message: this.state.message, componentStack: this.state.componentStack }}
          onClose={() => this.setState({ reportOpen: false })}
        />
      </>
    );
  }
}
