import React from 'react';

// Polyfill React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED for React 19 / Next.js compatibility
// with libraries like react-reconciler (@react-three/fiber) and framer-motion that access legacy secret internals.
if (typeof window !== 'undefined' || true) {
  const reactObj = React as any;
  if (reactObj) {
    if (!reactObj.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      reactObj.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
        reactObj.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS ||
        reactObj.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS ||
        {};
    }

    const secretInternals = reactObj.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

    if (secretInternals) {
      if (!secretInternals.ReactCurrentBatchConfig) {
        secretInternals.ReactCurrentBatchConfig = { transition: null };
      }
      if (!secretInternals.ReactCurrentDispatcher) {
        secretInternals.ReactCurrentDispatcher = { current: null };
      }
      if (!secretInternals.ReactCurrentOwner) {
        secretInternals.ReactCurrentOwner = { current: null };
      }
    }
  }
}

export {};
