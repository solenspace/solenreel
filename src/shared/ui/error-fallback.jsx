// @ts-check
import Button from './button';

/**
 * @param {{ error?: Error | null, resetErrorBoundary?: () => void }} props
 */
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="bg-bg flex min-h-screen items-center justify-center">
      <div className="max-w-md px-6 text-center">
        <h2 className="mb-4 text-2xl font-bold text-white">Something went wrong</h2>
        <p className="mb-6 text-gray-400">{error?.message || 'An unexpected error occurred.'}</p>
        {resetErrorBoundary && (
          <Button onClick={resetErrorBoundary} variant="primary">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;
