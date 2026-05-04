// @ts-check
const SkeletonBanner = () => {
  return (
    <div className="bg-bg-elevated relative h-[80vh] w-full animate-pulse">
      <div className="absolute bottom-20 left-4 space-y-4 md:left-12">
        <div className="bg-bg-elevated h-8 w-64 rounded" />
        <div className="bg-bg-elevated h-12 w-96 rounded" />
        <div className="bg-bg-elevated h-4 w-[500px] max-w-[80vw] rounded" />
        <div className="bg-bg-elevated h-4 w-[400px] max-w-[70vw] rounded" />
        <div className="mt-4 flex gap-3">
          <div className="bg-bg-elevated h-12 w-32 rounded" />
          <div className="bg-bg-elevated h-12 w-40 rounded" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonBanner;
