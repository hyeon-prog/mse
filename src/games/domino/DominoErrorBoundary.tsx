import { Component, type ReactNode } from "react";

interface DominoErrorBoundaryProps {
  children: ReactNode;
}

interface DominoErrorBoundaryState {
  hasError: boolean;
}

export class DominoErrorBoundary extends Component<DominoErrorBoundaryProps, DominoErrorBoundaryState> {
  state: DominoErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DominoErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("도미노 화면에서 오류가 발생했습니다:", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="domino-menu">
          <div className="domino-menu__panel">
            <p className="domino-menu__title" style={{ fontSize: "1.4rem" }}>
              문제가 발생했습니다
            </p>
            <p className="domino-menu__subtitle">페이지를 새로고침해 다시 시도해주세요.</p>
            <button className="domino-menu__start" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
