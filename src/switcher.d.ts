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
 * const isOnAsync = await switcher.isItOnBool('MY_SWITCHER', true);
 * const detailAsync = await switcher.isItOnDetail('MY_SWITCHER', true);
 * ```
 */
export class Switcher {

  /**
   * Execute criteria with boolean result (synchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns boolean value
   */
  isItOnBool(key: string, forceAsync?: false): boolean;

  /**
   * Execute criteria with boolean result (asynchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns Promise<boolean> value
   */
  isItOnBool(key: string, forceAsync?: true): Promise<boolean>;

  /**
   * Execute criteria with boolean result
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns boolean value or Promise<boolean> based on execution mode
   */
  isItOnBool(key: string, forceAsync?: boolean): Promise<boolean> | boolean;

  /**
   * Execute criteria with detail information (synchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns SwitcherResult object
   */
  isItOnDetail(key: string, forceAsync?: false): SwitcherResult;

  /**
   * Execute criteria with detail information (asynchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns Promise<SwitcherResult> object
   */
  isItOnDetail(key: string, forceAsync?: true): Promise<SwitcherResult>;

  /**
   * Execute criteria with detail information
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns SwitcherResult or Promise<SwitcherResult> based on execution mode
   */
  isItOnDetail(key: string, forceAsync?: boolean): Promise<SwitcherResult> | SwitcherResult;

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