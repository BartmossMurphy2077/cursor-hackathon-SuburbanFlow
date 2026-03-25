import { Component, type ErrorInfo, type ReactNode } from "react";

import { useAuthStore } from "../stores/authStore";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    useAuthStore.getState().logout();
    this.setState({ hasError: false, message: "" });
    window.location.href = "/login";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--ac-bg)", color: "var(--ac-ink)" }}>
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-canvas-border bg-canvas-elevated/80 p-6 shadow-bar backdrop-blur-xl">
          <h1 className="text-lg font-semibold text-canvas-ink">Something went wrong</h1>
          <p className="text-sm leading-relaxed text-canvas-muted">
            The app encountered an unexpected error. This is often caused by an
            expired session. Click below to sign out and start fresh.
          </p>
          <pre className="max-h-24 overflow-auto rounded-lg border border-canvas-border p-3 font-mono text-[10px] leading-relaxed text-rose-300" style={{ background: "var(--ac-surface)" }}>
            {this.state.message}
          </pre>
          <button
            type="button"
            onClick={this.handleReset}
            className="w-full rounded-lg bg-canvas-accent px-4 py-2.5 text-sm font-semibold text-canvas-bg hover:brightness-110"
          >
            Sign out and reload
          </button>
        </div>
      </div>
    );
  }
}
