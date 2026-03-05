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
        <div className="w-full h-full rounded-lg bg-military-800 flex items-center justify-center">
          <p className="text-military-400 text-sm">Map unavailable (WebGL not supported)</p>
        </div>
      );
    }
    return this.props.children;
  }
}
