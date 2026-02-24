/**
 * Root Error Boundary for Lovable deployment.
 * Catches React errors so the app shows a friendly message instead of a white screen.
 */
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  /** Optional fallback UI; defaults to inline message + retry */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[PediScreen] ErrorBoundary caught:", error, errorInfo);
    toast.error("Something went wrong", {
      description: "The page ran into an error. Try refreshing or going back.",
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-900">
          <div className="max-w-md space-y-4">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We ran into an unexpected error. You can try refreshing the page or
              return to the home page.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Try again
              </button>
              <a
                href={`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Go to home
              </a>
              <a
                href={`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/pediscreen`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                PediScreen
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
