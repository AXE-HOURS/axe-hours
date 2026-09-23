import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp, Copy, Check, Terminal } from 'lucide-react';

interface ErrorBoundaryProps {
  name?: string;
  fallback?: ReactNode;
  children?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    const moduleName = this.props.name || 'Unnamed Module';

    console.error(`[ErrorBoundary:${moduleName}] Component pipeline interrupted:`, error, errorInfo);

    // Call optional custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Telemetry Event Emission
    try {
      const telemetryEvent = {
        id: Date.now(),
        actionType: 'pipeline_disruption',
        actionTitle: `Disruption in ${moduleName}`,
        description: error.message || 'Unknown runtime error occurred.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
        createdAt: new Date().toISOString(),
        metadata: {
          component: moduleName,
          stack: error.stack?.slice(0, 500)
        }
      };

      // 1. Dispatch custom window event for real-time telemetry listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('axe_hours_telemetry', { detail: telemetryEvent }));

        // 2. Persist to user activities in localStorage
        const keys = ['axe_hours_user_activities'];
        // Also check for active user ID key if logged in
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('axe_hours_user_activities_')) {
            keys.push(k);
          }
        }

        keys.forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            const list = raw ? JSON.parse(raw) : [];
            list.unshift(telemetryEvent);
            localStorage.setItem(k, JSON.stringify(list.slice(0, 100)));
          } catch {}
        });
      }
    } catch (telemetryErr) {
      console.warn('[ErrorBoundary] Failed to emit telemetry event:', telemetryErr);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    });
  };

  handleCopyStack = (): void => {
    const { error, errorInfo } = this.state;
    const text = `Module: ${this.props.name || 'Unknown'}\nError: ${error?.toString()}\nComponent Stack:\n${errorInfo?.componentStack || 'No stack available'}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { fallback, name, children } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const moduleName = name || 'Workspace Module';

      return (
        <div className="w-full my-6 p-6 sm:p-8 rounded-2xl bg-[#09090b]/90 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(168,85,247,0.12)] relative overflow-hidden transition-all">
          {/* Cyber ambient glow backdrop */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)] shrink-0">
                  <ShieldAlert size={26} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-heading">
                      Component Pipeline Interrupted
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/30 text-purple-300">
                      {moduleName}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    A runtime disruption was caught and contained. The rest of your workspace remains operational.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw size={13} />
                  <span>Reset View</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
                  title="Hard reload workspace"
                >
                  Reload Page
                </button>
              </div>
            </div>

            {/* Error Message Snippet */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-red-500/20 text-xs font-mono text-red-300/90 flex items-center justify-between gap-3">
              <span className="truncate">
                {error?.message || 'Unknown runtime exception'}
              </span>
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 shrink-0 cursor-pointer font-sans"
              >
                <span>{showDetails ? 'Hide Diagnostics' : 'View Diagnostics'}</span>
                {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {/* Collapsible Diagnostics Accordion */}
            {showDetails && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal size={12} className="text-purple-400" />
                    Stack Trace & Component Hierarchy
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopyStack}
                    className="flex items-center gap-1 text-[10px] text-purple-300 hover:text-purple-200 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 transition-all cursor-pointer"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy Trace'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#030304] border border-white/5 text-[11px] font-mono text-gray-300/80 overflow-x-auto max-h-64 leading-relaxed select-text">
                  {error?.stack || error?.toString()}
                  {errorInfo?.componentStack && `\n\nComponent Hierarchy:${errorInfo.componentStack}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

