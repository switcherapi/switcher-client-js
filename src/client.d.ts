import { Switcher } from './switcher';

/**
* Quick start with the following 3 steps.
*
* 1. Use Client.buildContext() to define the arguments to connect to the API.
* 2. Use Client.getSwitcher() to create a new instance of Switcher.
* 3. Use the instance created to call isItOn to query the API.
*/
export class Client {

  /**
   * Create client context to be used by Switcher
   */
  static buildContext(context: SwitcherContext, options?: SwitcherOptions): void;

  /**
   * Creates a new instance of Switcher
   */
  static getSwitcher(key?: string): Switcher;


  /**
   * Read snapshot and load it into memory
   *
   * @param watchSnapshot when true, it will watch for snapshot file modifications
   * @param fetchRemote when true, it will initialize the snapshot from the API
   */
  static loadSnapshot(watchSnapshot?: boolean, fetchRemote?: boolean): Promise<void>;

  /**
   * Verifies if the current snapshot file is updated.
   * 
   * Return true if an update has been made.
   */
  static checkSnapshot(): Promise<boolean>;

  /**
   * Schedule Snapshot auto update.
   * 
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
   * @param switcherKeys Client Keys
   * @throws when one or more Client Keys were not found
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
   * Terminate watching snapshot files
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
   * Enable/Disable test mode.
   * 
   * It prevents from watching Snapshots that may hold process
   */
  static testMode(testEnabled?: boolean): void;

}

/**
 * ResultDetail is a detailed response from the API.
 */
export type ResultDetail = {
  result: boolean;
  reason: string;
  metadata: any;
}

/**
 * LoggerRecord is a detailed log of the execution.
 * 
 * Switcher.getLogger(key) returns an array of LoggerRecord.
 */
export type LoggerRecord = {
  key: string;
  input: string[][];
  response: ResultDetail
}

/**
 * SwitcherContext is required to build the context to communicate with the API.
 */
export type SwitcherContext = {
  url?: string;
  apiKey?: string;
  domain: string;
  component?: string;
  environment?: string;
}

/**
 * SwitcherOptions is optional to build the context to communicate with the API.
 */
export type SwitcherOptions = {
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
  getResponse(): ResultDetail;
}