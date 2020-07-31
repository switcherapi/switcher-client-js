export declare class ExecutionLogger {
    
  static logger: any[];

  /**
   * Add new execution result
   * 
   * @param key
   * @param response
   */
  static add(key: string, reasponse: any): void;

  /**
   * Retrieve results given a switcher key
   * 
   * @param key 
   */
  static getByKey(key: string): any[];
}