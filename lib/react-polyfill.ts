import React from 'react';

// Polyfill React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED for React 19 / Next.js client compatibility
// with libraries like react-reconciler (@react-three/fiber) and framer-motion that access legacy secret internals.
if (typeof window !== 'undefined') {
  const reactObj = React as any;
  if (reactObj) {
    // 1. Secret internals polyfill
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
      if (!secretInternals.ReactCurrentActQueue) {
        secretInternals.ReactCurrentActQueue = { current: null };
      }
    }

    // 2. Patch isValidElement to accept both React 18 and React 19 element symbols
    const origIsValidElement = reactObj.isValidElement;
    const REACT_ELEMENT_SYMBOL = Symbol.for('react.element');
    const REACT_TRANSITIONAL_ELEMENT_SYMBOL = Symbol.for('react.transitional.element');

    reactObj.isValidElement = function (object: any) {
      if (object && typeof object === 'object' && object.$$typeof) {
        if (
          object.$$typeof === REACT_ELEMENT_SYMBOL ||
          object.$$typeof === REACT_TRANSITIONAL_ELEMENT_SYMBOL ||
          (typeof object.$$typeof === 'symbol' &&
            object.$$typeof.description?.includes('react'))
        ) {
          return true;
        }
      }
      return origIsValidElement ? origIsValidElement(object) : false;
    };
  }
}

export {};
