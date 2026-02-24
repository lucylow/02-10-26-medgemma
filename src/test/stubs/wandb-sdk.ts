/**
 * Stub for @wandb/sdk when not installed (e.g. in Vitest without optional deps).
 */
const noop = () => {};
const asyncNoop = async () => {};

export default {
  init: asyncNoop,
  log: noop,
  finish: asyncNoop,
};
