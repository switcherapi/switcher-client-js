import Key from "./lib/key";

/**
 * Quick start with the following 3 steps.
 * 
 * 1. Use Switcher.buildContext() to define the arguments to connect to the API.
 * 2. Use Switcher.factory() to create a new instance of Switcher.
 * 3. Use the instance created to call isItOn to query the API.
 */
declare class Switcher {

  constructor();

  /**
   * Create the necessary configuration to communicate with the API
   * 
   * @param context Necessary arguments
   * @param options 
   */
 static buildContext(context: Switcher.SwitcherContext, options: Switcher.SwitcherOptions): void;

 /**
  * Creates a new instance of Switcher
  */
 static factory(): Switcher;

 /**
  * Read snapshot file locally and store in a parsed JSON object
  */
 static loadSnapshot(): Promise<void>;

 /**
  * Verifies if the current snapshot file is updated.
  * Return true if an update has been made.
  */
 static checkSnapshot(): Promise<boolean>;

 /**
  * Remove snapshot from real-time update
  */
 static unloadSnapshot(): void;

  /**
  * Strategies available to use as Switcher input
  */
 static get StrategiesType(): Switcher.StrategiesType;

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

 /**
  * Retrieve execution log given a switcher key
  * 
  * @param key 
  */
 static getLogger(key: string): any[];

  /**
  * Enable testing mode
  * It prevents from watching Snapshots that may hold process
  */
 static setTestEnabled() : void;

 /**
  * Disable testing mode
  */
 static setTestDisabled(): void;

  /**
  * Validate the input provided to access the API
  */
 validate(): Promise<void>;

 /**
  * Pre-set input values before calling the API
  * 
  * @param key 
  * @param input 
  */
 prepare(key: string, input?: string[]): Promise<void>;
 
 /**
  * Execute async criteria
  * 
  * @param key 
  * @param input 
  * @param showReason
  */
 isItOn(key?: string, input?: string[], showReason?: boolean): Promise<boolean>;
 
}

declare namespace Switcher {

  interface SwitcherContext {
    url: string;
    apiKey: string;
    domain: string;
    component: string;
    environment: string;
    token?: string;
    exp?: number;
   }
   
   interface SwitcherOptions {
    offline: boolean;
    logger: boolean;
    snapshotLocation: string;
    snapshotAutoload: string;
    silentMode: boolean;
    retryAfter: string;
   }
   
   interface StrategiesType {
    NETWORK: string;
    VALUE: string;
    NUMERIC: string;
    TIME: string;
    DATE: string;
    REGEX: string;
   }
}

export = Switcher;