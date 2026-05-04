// @ts-check
import { Component } from 'react';
import ErrorFallback from './error-fallback';

/**
 * @typedef {{ children?: React.ReactNode }} ErrorBoundaryProps
 * @typedef {{ hasError: boolean, error: Error | null }} ErrorBoundaryState
 * @augments {Component<ErrorBoundaryProps, ErrorBoundaryState>}
 */
class ErrorBoundary extends Component {
  /** @type {ErrorBoundaryState} */
  state = { hasError: false, error: null };

  /**
   * @param {Error} error
   * @returns {ErrorBoundaryState}
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
