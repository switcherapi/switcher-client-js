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
  bypassedKeys: Key;
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
  
  isItOn(key?: string, input?: string[]): boolean;
  isItOnPromise(key?: string, input?: string[]): Promise<boolean>;

  /**
   * Force a switcher value to return a given value by calling one of both methods - true() false()
   * 
   * @param key 
   */
  assume(key: string): Key;

  /**
   * Remove forced value from a switcher
   * 
   * @param key 
   */
  forget(key: string): void;

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
}

declare interface SwitcherOptions {
  offline: boolean;
  snapshotLocation: string;
  silentMode: boolean;
  retryAfter: string;
}

declare class Key {

  constructor(key: string);

  key: string;
  valaue: boolean;

  true(): void;
  false(): void;
  getKey(): string;
  getValue(): boolean;
}

export = Switcher;