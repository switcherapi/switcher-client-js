// Copyright 2024-present the Switcher API authors. All rights reserved. MIT license.

/**
 * Switcher Clinet SDK for working with Switcher API
 *
 * ```ts
 * import { Client } from 'switcher-client';
 *
 * Client.buildContext({ url, apiKey, domain, component, environment });
 *
 * const switcher = Client.getSwitcher();
 * await switcher.isItOn('SWITCHER_KEY'));
 * ```
 *
 * @module
 */

export { Client, ResultDetail, SwitcherContext, SwitcherOptions } from './src/client.js';
export { Switcher } from './src/switcher.js';
export { StrategiesType } from './src/lib/snapshot.js';