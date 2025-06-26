import { SwitcherBuilder } from './switcherBuilder.js';

export class SwitcherRequest extends SwitcherBuilder {
  /**
  * Return switcher key
  */
  get key() {
    return this._key;
  }

  /**
   * Return switcher current strategy input
   */
  get input() {
    return this._input;
  }

  /**
   * Return Relay restriction value
   */
  get isRelayRestricted() {
    return this._restrictRelay;
  }
}