import Key from "./lib/key";

declare class Switcher {

  constructor(
    url: string, 
    apiKey: string, 
    domain: string, 
    component: string, 
    environment: string, 
    options?: SwitcherOptions);

  url: string;
  token: string;
  apiKey: string;
  domain: string;
  environment: string;
  key: string;
  input: string[];
  exp: number;
  snapshot?: string;
  
  /**
   * Validate the input provided to access the API
   */
  validate(): void;

  /**
   * Pre-set input values before calling the API
   * 
   * @param key 
   * @param input 
   */
  prepare(key: string, input?: string[]): void;
  
  /**
   * Execute async criteria
   * 
   * @param key 
   * @param input 
   */
  isItOn(key?: string, input?: string[]): boolean;

  /**
   * Execute async criteria
   * 
   * @param key 
   * @param input 
   */
  isItOnPromise(key?: string, input?: string[]): Promise<boolean>;

  /**
   * Read snapshot file locally and store in a parsed JSON object
   */
  loadSnapshot(): void;

  /**
   * Verifies if the current snapshot file is updated.
   * Return true if an update has been made.
   */
  checkSnapshot(): boolean;

  /**
   * Remove snapshot from real-time update
   */
  unloadSnapshot(): void;

  /**
   * Force a switcher value to return a given value by calling one of both methods - true() false()
   * 
   * @param key 
   */
  static assume(key: string): Key;

  /**
   * Remove forced value from a switcher
   * 
   * @param key 
   */
  static forget(key: string): void;
}

declare interface SwitcherOptions {
  offline: boolean;
  snapshotLocation: string;
  silentMode: boolean;
  retryAfter: string;
}

export = Switcher;