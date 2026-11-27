import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('GrowWish ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="thanks-page">
          <div style={{ maxWidth: 460 }}>
            <h1>GROWWISH</h1>
            <p>
              Something went wrong while loading this view. Please refresh to
              try again.
            </p>
            <p style={{ marginTop: 18 }}>
              <button
                type="button"
                className="btn clay"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
