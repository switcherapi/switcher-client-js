// Copyright 2024-present the Switcher API authors. All rights reserved. MIT license.

/**
 * Switcher Clinet SDK for working with Switcher API
 *
 * ```ts
 * import { Switcher } from 'switcher-client';
 *
 * Switcher.buildContext({ url, apiKey, domain, component, environment });
 *
 * const switcher = Switcher.factory();
 * await switcher.isItOn('SWITCHER_KEY'));
 * ```
 *
 * @module
 */

export { Switcher } from './src/index.js';
export {
  checkDate,
  checkNetwork,
  checkNumeric,
  checkRegex,
  checkTime,
  checkValue,
  checkPayload
} from './src/lib/middlewares/check.js';