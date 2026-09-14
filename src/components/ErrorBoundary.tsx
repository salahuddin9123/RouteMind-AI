import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-surface-900/90 backdrop-blur-md rounded-xl border border-white/10 min-h-[350px]">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {this.props.fallbackTitle || 'Route display error — please try again'}
          </h3>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            {this.props.fallbackMessage ||
              'A temporary display issue occurred while rendering the map route. Please click below to reload the view.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shadow-lg shadow-brand-500/20"
            >
              <RefreshCw size={15} />
              Reload Map View
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Refresh Page
            </button>
          </div>

          {this.state.error && (
            <details className="mt-6 text-left max-w-lg w-full text-xs text-gray-500 bg-surface-800/60 p-3 rounded-lg border border-white/5">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-300 font-medium">
                Technical error details
              </summary>
              <p className="mt-2 text-red-400 font-mono break-all">
                {this.state.error.toString()}
              </p>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
