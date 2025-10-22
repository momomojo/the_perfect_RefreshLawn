import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { captureException } from '../../../lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the entire app. Integrates with Sentry for error tracking.
 *
 * @example
 * <ErrorBoundary fallbackMessage="Dashboard Error">
 *   <DashboardContent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details and send to Sentry
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Send to Sentry for production monitoring
    captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: this.props.fallbackMessage || 'unknown',
      },
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  /**
   * Reset the error boundary state
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackMessage = 'Something went wrong' } = this.props;
      const { error, errorInfo } = this.state;

      return (
        <View className="flex-1 items-center justify-center bg-white p-6">
          <View className="w-full max-w-md items-center">
            {/* Error Icon */}
            <View className="mb-4 rounded-full bg-red-100 p-4">
              <AlertCircle size={48} color="#ef4444" />
            </View>

            {/* Error Title */}
            <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
              {fallbackMessage}
            </Text>

            {/* Error Message */}
            <Text className="mb-6 text-center text-gray-600">
              We're sorry, but something unexpected happened. Please try again.
            </Text>

            {/* Retry Button */}
            <TouchableOpacity
              className="mb-4 w-full flex-row items-center justify-center rounded-lg bg-green-600 px-6 py-3"
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <RefreshCw size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Try Again
              </Text>
            </TouchableOpacity>

            {/* Error Details (Development Only) */}
            {__DEV__ && error && (
              <ScrollView className="mt-4 max-h-64 w-full rounded-lg bg-gray-100 p-4">
                <Text className="mb-2 font-bold text-red-600">
                  Error Details (Dev Mode):
                </Text>
                <Text className="mb-2 text-sm text-gray-800">
                  {error.toString()}
                </Text>
                {errorInfo && (
                  <Text className="text-xs text-gray-600">
                    {errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            {/* Help Text */}
            <Text className="mt-4 text-center text-sm text-gray-500">
              If this problem persists, please contact support.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
