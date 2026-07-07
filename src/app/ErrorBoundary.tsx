import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Astra crashed:', error, info.componentStack)
  }

  private handleRetry = (): void => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-dvh w-dvw flex-col items-center justify-center gap-4 bg-space-950 px-6 text-center text-star-100">
          <p className="text-lg font-medium">The sky went dark for a moment.</p>
          <p className="max-w-sm text-sm text-star-500">
            Something interrupted the view. You can try bringing it back.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-full border border-glass-border bg-glass px-4 py-2 text-sm text-star-100 backdrop-blur-glass transition hover:border-accent-400/50"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
