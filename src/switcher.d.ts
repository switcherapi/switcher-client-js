import { SwitcherResult } from './lib/result.js';

export type SwitcherExecutionResult = Promise<boolean | SwitcherResult> | boolean | SwitcherResult;

/**
 * Switcher handles criteria execution and validations.
 *
 * The class provides methods to execute criteria with both boolean and detailed results,
 * and supports both synchronous and asynchronous execution modes.
 *
 * @example
 * Example usage of the Switcher class:
 * ```typescript
 * // Local mode - synchronous execution
 * const isOn = switcher.isItOnBool();
 * const { result, reason, metadata } = switcher.isItOnDetail();
 *
 * // Force asynchronous execution
 * const isOnAsync = await switcher.isItOnBool(true);
 * const detailAsync = await switcher.isItOnDetail(true);
 * ```
 */
export class Switcher {

  /**
   * Execute criteria with boolean result (synchronous, uses persisted key)
   *
   * @returns boolean result
   */
  isItOnBool(): boolean;

  /**
   * Execute criteria with boolean result (synchronous)
   *
   * @param key - switcher key
   * @returns boolean result
   */
  isItOnBool(key: string): boolean;
  
  /**
   * Execute criteria with boolean result (asynchronous, uses persisted key)
   *
   * @param forceAsync - when true, forces async execution
   * @returns Promise<boolean> result
   */
  isItOnBool(forceAsync: true): Promise<boolean>;

  /**
   * Execute criteria with boolean result (asynchronous)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns Promise<boolean> result
   */
  isItOnBool(key: string, forceAsync: true): Promise<boolean>;

  /**
   * Execute criteria with detail information (synchronous)
   *
   * @returns SwitcherResult object
   */
  isItOnDetail(): SwitcherResult;

  /**
   * Execute criteria with detail information (synchronous)
   *
   * @param key - switcher key
   * @returns SwitcherResult object
   */
  isItOnDetail(key: string): SwitcherResult;

  /**
   * Execute criteria with detail information (asynchronous, uses persisted key)
   *
   * @param forceAsync - when true, forces async execution
   * @returns Promise<SwitcherResult> object
   */
  isItOnDetail(forceAsync: true): Promise<SwitcherResult>;

  /**
   * Execute criteria with detail information (asynchronous)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns Promise<SwitcherResult> object
   */
  isItOnDetail(key: string, forceAsync: true): Promise<SwitcherResult>;

  /**
   * Execute criteria
   *
   * @param key - switcher key
   * @returns {SwitcherExecutionResult} - boolean value or SwitcherResult when detail() is applied
   */
  isItOn(key?: string): SwitcherExecutionResult;

  /**
   * Schedules background refresh of the last criteria request
   */
  scheduleBackgroundRefresh(): void;

  /**
   * Execute criteria from remote API
   */
  async executeRemoteCriteria(): Promise<boolean | SwitcherResult>;

  /**
   * Execute criteria from local snapshot
   */
  executeLocalCriteria(): boolean | SwitcherResult;

  /**
   * Validates client settings for remote API calls
   */
  validate(): Promise<void>;

  /**
   * Checks API credentials and connectivity
   */
  prepare(key?: string): Promise<void>;

  /**
   * Define a delay (ms) for the next async execution.
   * 
   * Activating this option will enable logger by default
   */
  throttle(delay: number): Switcher;

  /**
   * Force the use of the remote API when local is enabled
   */
  remote(forceRemote?: boolean): Switcher;

  /**
   * When enabled, isItOn will return a SwitcherResult object
   */
  detail(showDetail?: boolean): Switcher;

  /**
   * Define a default result when the client enters in panic mode
   */
  defaultResult(defaultResult: boolean): Switcher;

  /**
   * Allow local snapshots to ignore or require Relay verification.
   */
  restrictRelay(restrict: boolean): Switcher;

  /**
   * Adds a strategy for validation
   */
  check(startegyType: string, input: string): Switcher;

  /**
   * Adds VALUE_VALIDATION input for strategy validation
   */
  checkValue(input: string): Switcher;

  /**
   * Adds NUMERIC_VALIDATION input for strategy validation
   */
  checkNumeric(input: string): Switcher;

  /**
   * Adds NETWORK_VALIDATION input for strategy validation
   */
  checkNetwork(input: string): Switcher;

  /**
   * Adds DATE_VALIDATION input for strategy validation
   */
  checkDate(input: string): Switcher;

  /**
   * Adds TIME_VALIDATION input for strategy validation
   */
  checkTime(input: string): Switcher;

  /**
   * Adds REGEX_VALIDATION input for strategy validation
   */
  checkRegex(input: string): Switcher;

  /**
   * Adds PAYLOAD_VALIDATION input for strategy validation
   */
  checkPayload(input: string): Switcher;

  /**
   * Return switcher key
   */
  get key(): string;

  /**
   * Return switcher current strategy input
   */
  get input(): string[][] | undefined;

  /**
   * Return switcher Relay restriction settings
   */
  get isRelayRestricted(): boolean;
}