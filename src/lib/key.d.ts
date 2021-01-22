declare class Key {

  /**
   * @param key Switcher name
   */
  constructor(key: string);

  key: string;
  valaue: boolean;

  /**
   * Force result to true
   */
  true(): void;

  /**
   * Force result to false
   */
  false(): void;

  /**
   * Return selected switcher name
   */
  getKey(): string;

  /**
   * Return current value
   */
  getValue(): boolean;
}

export default Key;