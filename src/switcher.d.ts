import { SwitcherResult } from './lib/result.js';

/**
 * Switcher handles criteria execution and validations.
 *
 * Create a intance of Switcher using Client.getSwitcher()
 */
export class Switcher {

  /**
   * Validates client settings for remote API calls
   */
  validate(): Promise<void>;

  /**
   * Checks API credentials and connectivity
   */
  prepare(key?: string): Promise<void>;

  /**
   * Execute criteria
   *
   * @returns boolean or SwitcherResult when detail() is used
   */
  isItOn(key?: string): Promise<boolean | SwitcherResult> | boolean | SwitcherResult;

  /**
   * Schedules background refresh of the last criteria request
   */
  scheduleBackgroundRefresh(): void;

  /**
   * Execute criteria from remote API
   */
  async executeRemoteCriteria(): Promise<boolean | SwitcherResult>

  /**
   * Execute criteria from local snapshot
   */
  async executeLocalCriteria(): Promise<boolean | SwitcherResult>

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
}