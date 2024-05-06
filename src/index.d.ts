declare namespace SwitcherClient {

  /**
   * Quick start with the following 3 steps.
   * 
   * 1. Use Switcher.buildContext() to define the arguments to connect to the API.
   * 2. Use Switcher.factory() to create a new instance of Switcher.
   * 3. Use the instance created to call isItOn to query the API.
   */
  class Switcher {

    /**
     * Create the necessary configuration to communicate with the API
     */
    static buildContext(context: SwitcherContext, options?: SwitcherOptions): void;

    /**
     * Creates a new instance of Switcher
     */
    static factory(): Switcher;

    /**
     * Read snapshot file locally and store in a parsed JSON object
     */
    static loadSnapshot(watchSnapshot?: boolean, fetchRemote?: boolean): Promise<void>;

    /**
     * Verifies if the current snapshot file is updated.
     * 
     * Return true when an update has been executed.
     */
    static checkSnapshot(): Promise<boolean>;

    /**
     * Schedule Snapshot auto update.
     * It can also be configured using SwitcherOptions 'snapshotAutoUpdateInterval' when
     * building context
     * 
     * @param interval in ms
     */
    static scheduleSnapshotAutoUpdate(interval?: number, callback?: (updated: boolean, err: Error) => void): void;

    /**
     * Terminates Snapshot Auto Update
     */
    static terminateSnapshotAutoUpdate(): void;

    /**
     * Verifies if switchers are properly configured
     * 
     * @param switcherKeys Switcher Keys
     * @throws when one or more Switcher Keys were not found
     */
    static checkSwitchers(switcherKeys: string[]): Promise<void>;

    /**
     * Start watching snapshot files for modifications
     * 
     * @param success when snapshot has successfully updated
     * @param error when any error has thrown when attempting to load snapshot
     */
    static watchSnapshot(success?: () => void, error?: (err: any) => void): void;

    /**
     * Remove snapshot from real-time update
     */
    static unloadSnapshot(): void;

    /**
     * Subscribe to notify when an asynchronous error is thrown.
     * 
     * It is usually used when throttle and silent mode are enabled.
     * 
     * @param callback function to be called when an error is thrown
     */
    static subscribeNotifyError(callback: (err: Error) => void): void;

    /**
     * Force a switcher value to return a given value by calling one of both methods - true() false()
     */
    static assume(key: string): Key;

    /**
     * Remove forced value from a switcher
     */
    static forget(key: string): void;

    /**
     * Retrieve execution log given a switcher key
     */
    static getLogger(key: string): LoggerRecord[];

    /**
     * Clear all results from the execution log
     */
    static clearLogger(): void;

    /**
    * Enable/Disable test mode
    * It prevents from watching Snapshots that may hold process
    */
    static testMode(testEnabled?: boolean): void;

    /**
    * Validate the input provided to access the API
    */
    validate(): Promise<void>;

    /**
     * Pre-set input values before calling the API
     */
    prepare(key: string, input?: string[][]): Promise<void>;

    /**
     * Execute async criteria
     * 
     * @returns boolean or ResultDetail when detail() is used
     */
    isItOn(key?: string, input?: string[][]): Promise<boolean | ResultDetail>;

    /**
     * Configure the time elapsed between each call to the API.
     * Activating this option will enable loggers.
     * 
     * @param delay in milliseconds
     */
    throttle(delay: number): Switcher;

    /**
     * Force the use of the remote API when local is enabled
     *
     * @param forceRemote default true
     */
    remote(forceRemote?: boolean): Switcher;

    /**
     * Enable or disable detailed result when using isItOn as ResultDetail
     * 
     * @param showDetail default true
     */
    detail(showDetail?: boolean): Switcher;
  }

  /**
   * ResultDetail is a detailed response from the API.
   */
  type ResultDetail = {
    result: boolean;
    reason: string;
    metadata: any;
  }

  /**
   * LoggerRecord is a detailed log of the execution.
   * 
   * Switcher.getLogger(key) returns an array of LoggerRecord.
   */
  type LoggerRecord = {
    key: string;
    input: string[][];
    response: ResultDetail
  }

  /**
   * SwitcherContext is required to build the context to communicate with the API.
   */
  type SwitcherContext = {
    url?: string;
    apiKey?: string;
    domain: string;
    component?: string;
    environment?: string;
    token?: string;
    exp?: number;
  }

  /**
   * SwitcherOptions is optional to build the context to communicate with the API.
   */
  type SwitcherOptions = {
    local?: boolean;
    logger?: boolean;
    snapshotLocation?: string;
    snapshotAutoUpdateInterval?: number;
    silentMode?: string;
    regexSafe?: boolean;
    regexMaxBlackList?: number;
    regexMaxTimeLimit?: number;
    certPath?: string;
  }

  /**
   * Plain text validation. No format required.
   */
  function checkValue(input: string): string[];

  /**
   * Numeric type validation. It accepts positive/negative and decimal values.
   */
  function checkNumeric(input: string): string[];

  /**
   * This validation accept CIDR (e.g. 10.0.0.0/24) or IPv4 (e.g. 10.0.0.1) formats.
   */
  function checkNetwork(input: string): string[];

  /**
   * Date validation accept both date and time input (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm) formats.
   */
  function checkDate(input: string): string[];

  /**
   * This validation accept only HH:mm format input.
   */
  function checkTime(input: string): string[];

  /**
   * Regular expression based validation. No format required.
   */
  function checkRegex(input: string): string[];

  /**
   * Validates JSON keys from a given payload
   */
  function checkPayload(input: string): string[];

}

declare class Key {

  constructor(key: string);

  /**
   * Force result to true
   */
  true(): Key;

  /**
   * Force result to false
   */
  false(): Key;

  /**
   * Return selected switcher name
   */
  getKey(): Key;

  /**
   * Define metadata for the response
   */
  withMetadata(metadata: any): Key;

  /**
   * Return key response
   */
  getResponse(): SwitcherClient.ResultDetail;
}

export = SwitcherClient;