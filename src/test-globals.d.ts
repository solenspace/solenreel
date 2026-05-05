declare global {
  // eslint-disable-next-line no-var
  var __triggerIntersection: (entry: Partial<IntersectionObserverEntry>) => void;
  // eslint-disable-next-line no-var
  var __setPrefersReducedMotion: (value: boolean) => void;
}
export {};
