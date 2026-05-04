// @ts-check
const LoadingScreen = () => {
  return (
    <div className="bg-bg fixed inset-0 z-50 flex items-center justify-center">
      <div className="border-accent h-16 w-16 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
};

export default LoadingScreen;
