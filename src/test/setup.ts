import "@testing-library/jest-dom";

// jsdom does not have IntersectionObserver (required by framer-motion)
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    // Immediately call callback as if element is in view
    setTimeout(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver), 0);
  }
  observe = () => null;
  unobserve = () => null;
  disconnect = () => null;
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
