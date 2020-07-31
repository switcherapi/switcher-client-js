import Key from "./key";

export declare class Bypasser {
    
  static bypassedKeys: Key;

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
   * Search for key registered via 'assume'
   * 
   * @param key 
   */
  static searchBypassed(key: string): Key;
}