import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
          <p className="text-[var(--color-text-secondary)] text-sm">Map unavailable (WebGL not supported)</p>
        </div>
      );
    }
    return this.props.children;
  }
}
