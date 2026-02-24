/**
 * Stub for prom-client when not installed (e.g. in Vitest without optional deps).
 */
const noop = () => {};
const asyncNoop = (): Promise<string> => Promise.resolve('# Metrics not available\n');

function Counter() {
  return { inc: noop };
}
function Histogram() {
  return { observe: noop };
}
const register = {
  contentType: 'text/plain',
  metrics: asyncNoop,
};

export default {
  Counter,
  Histogram,
  register,
};
