import { ResultDetail } from "./client";

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
  prepare(key: string): Promise<void>;

  /**
   * Execute criteria
   * 
   * @returns boolean or ResultDetail when detail() is used
   */
  isItOn(key?: string): Promise<boolean | ResultDetail>;

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
   * When enabled, isItOn will return a ResultDetail object
   */
  detail(showDetail?: boolean): Switcher;

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
   * Return switcher current strategy input
   */
  get input(): string[][] | undefined;
}