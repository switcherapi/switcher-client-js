import { GlobalOptions } from './lib/globals/globalOptions.js';
import { StrategiesType } from './lib/snapshot.js';

export class SwitcherBuilder {
  _delay = 0;
  _nextRun = 0;
  _input;
  _key = '';
  _defaultResult;
  _forceRemote = false;
  _showDetail = false;
  _restrictRelay = true;

  constructor(key) {
    this._key = key;
  }

  throttle(delay) {
    this._delay = delay;

    if (delay > 0) {
      GlobalOptions.updateOptions({ logger: true });
    }

    return this;
  }

  remote(forceRemote = true) {
    if (!GlobalOptions.local) {
      throw new Error('Local mode is not enabled');
    }

    this._forceRemote = forceRemote;
    return this;
  }

  detail(showDetail = true) {
    this._showDetail = showDetail;
    return this;
  }

  defaultResult(defaultResult) {
    this._defaultResult = defaultResult;
    return this;
  }
  
  restrictRelay(restrict = true) {
    this._restrictRelay = restrict;
    return this;
  }

  check(startegyType, input) {
    if (!this._input) {
      this._input = [];
    }

    this._input.push([startegyType, input]);
    return this;
  }

  checkValue(input) {
    return this.check(StrategiesType.VALUE, input);
  }

  checkNumeric(input) {
    return this.check(StrategiesType.NUMERIC, input);
  }

  checkNetwork(input) {
    return this.check(StrategiesType.NETWORK, input);
  }

  checkDate(input) {
    return this.check(StrategiesType.DATE, input);
  }

  checkTime(input) {
    return this.check(StrategiesType.TIME, input);
  }

  checkRegex(input) {
    return this.check(StrategiesType.REGEX, input);
  }

  checkPayload(input) {
    return this.check(StrategiesType.PAYLOAD, input);
  }
}