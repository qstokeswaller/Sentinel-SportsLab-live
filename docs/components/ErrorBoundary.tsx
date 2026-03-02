import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-rose-50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-rose-100 p-12 max-w-2xl w-full text-center">
                        <div className="w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-lg shadow-rose-200">
                            <span className="text-4xl font-black">!</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Application Crash</h1>
                        <p className="text-slate-500 font-medium mb-8">
                            TrainerOS encountered a critical error. This is likely due to the missing database schema we're currently restoring.
                        </p>
                        <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 overflow-auto max-h-48">
                            <p className="text-xs font-mono text-rose-600 break-all">
                                {this.state.error?.toString()}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-2">
                                {this.state.error?.stack}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
