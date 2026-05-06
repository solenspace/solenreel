// @ts-check
const SkeletonRow = () => {
  return (
    <div className="my-6 px-4 md:px-12" data-testid="skeleton-row">
      <div className="bg-bg-elevated mb-4 h-6 w-48 animate-pulse rounded" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-elevated h-[300px] w-[200px] flex-shrink-0 animate-pulse rounded-md"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default SkeletonRow;
