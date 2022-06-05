'use strict';

const Bypasser = require('./lib/bypasser');
const ExecutionLogger = require('./lib/utils/executionLogger');
const DateMoment = require('./lib/utils/datemoment');
const { loadDomain, validateSnapshot, checkSwitchers } = require('./lib/snapshot');
const services = require('./lib/services');
const checkCriteriaOffline = require('./lib/resolver');
const fs = require('fs');

const {
  checkDate,
  checkNetwork,
  checkNumeric,
  checkRegex,
  checkTime,
  checkValue
} = require('./lib/middlewares/check');

const DEFAULT_URL = 'https://switcher-api.herokuapp.com';
const DEFAULT_ENVIRONMENT = 'default';
const DEFAULT_SNAPSHOT_LOCATION = './snapshot/';
const DEFAULT_RETRY_TIME = '5m';
const DEFAULT_OFFLINE = false;
const DEFAULT_LOGGER = false;
const DEFAULT_TEST_MODE = false;

class Switcher {

  constructor() {
    this._delay = 0;
    this._nextRun = 0;
  }

  static buildContext(context, options) {
    this.testEnabled = DEFAULT_TEST_MODE;

    this.snapshot = undefined;
    this.context = {};
    this.context = context;
    this.context.environment = context.environment || DEFAULT_ENVIRONMENT;
    this.context.url = context.url || DEFAULT_URL;

    // Default values
    this.options = {};
    this.options.offline = DEFAULT_OFFLINE;
    this.options.snapshotLocation = DEFAULT_SNAPSHOT_LOCATION;
    this.options.logger = DEFAULT_LOGGER;

    if (options) {
      if ('offline' in options) {
        this.options.offline = options.offline;
      }

      if ('snapshotLocation' in options) {
        this.options.snapshotLocation = options.snapshotLocation;
      }

      if ('silentMode' in options) {
        this.options.silentMode = options.silentMode;
        this.loadSnapshot();
      }

      if ('logger' in options) {
        this.options.logger = options.logger;
      }

      if ('retryAfter' in options) {
        this.options.retryTime =  options.retryAfter.slice(0, -1);
        this.options.retryDurationIn = options.retryAfter.slice(-1);
      } else {
        this.options.retryTime = DEFAULT_RETRY_TIME.charAt(0);
        this.options.retryDurationIn = DEFAULT_RETRY_TIME.charAt(1);
      }
    }
  }

  static factory() {
    return new Switcher();
  }

  static async checkSnapshot() {
    if (Switcher.snapshot) {
      if (!Switcher.context.exp || Date.now() > (Switcher.context.exp*1000)) {
        await Switcher._auth();
        
        const result = await validateSnapshot(Switcher.context, Switcher.options.snapshotLocation, 
          Switcher.snapshot.data.domain.version);
        
        if (result) {
          Switcher.loadSnapshot();
          return true;
        }
      }
      return false;
    }
  }

  static async loadSnapshot() {
    const snapshotFile = `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;
    Switcher.snapshot = loadDomain(Switcher.options.snapshotLocation, Switcher.context.environment);

    if (Switcher.snapshot.data.domain.version == 0 && !Switcher.options.offline) {
      await Switcher.checkSnapshot();
    } else if (!Switcher.testEnabled) {
      fs.unwatchFile(snapshotFile);
      fs.watchFile(snapshotFile, () => {
        Switcher.snapshot = loadDomain(Switcher.options.snapshotLocation, Switcher.context.environment);
      });
    }
  }

  static unloadSnapshot() {
    if (!Switcher.testEnabled) {
      const snapshotFile = `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;
      Switcher.snapshot = undefined;
      fs.unwatchFile(snapshotFile);
    }
  }

  static async checkSwitchers(switcherKeys) {
    if (Switcher.options.offline) {
      checkSwitchers(Switcher.snapshot, switcherKeys);
    } else {
      await Switcher._auth();
      await services.checkSwitchers(
        Switcher.context.url, Switcher.context.token, switcherKeys);
    }
  }

  static async _auth() {
    const response = await services.auth(Switcher.context);
    Switcher.context.token = response.token;
    Switcher.context.exp = response.exp;
  }

  static async _checkHealth() {
    // checks if silent mode is still activated
    if (Switcher.context.token === 'SILENT') {
      if (!Switcher.context.exp || Date.now() < (Switcher.context.exp*1000)) {
        const expirationTime = new DateMoment(new Date())
          .add(Switcher.options.retryTime, Switcher.options.retryDurationIn).getDate();
        
        Switcher.context.exp = expirationTime.getTime() / 1000;
        return false;
      }
    }
    
    const response = await services.checkAPIHealth(Switcher.context.url, {
      silentMode: Switcher.options.silentMode,
      retryTime: Switcher.options.retryTime,
      retryDurationIn: Switcher.options.retryDurationIn
    });

    if (response) {
      Switcher.context.token = response.data.token;
      Switcher.context.exp = response.data.exp;
      return false;
    }

    return true;
  }

  static assume(key) {
    return Bypasser.assume(key);
  }

  static forget(key) {
    return Bypasser.forget(key);
  }

  static getLogger(key) {
    return ExecutionLogger.getByKey(key);
  }

  static setTestEnabled() {
    Switcher.testEnabled = true;
  }

  static setTestDisabled() {
    Switcher.testEnabled = false;
  }

  async prepare(key, input) {
    this.key = key;

    if (input) { this.input = input; }

    if (!Switcher.options.offline) {
      await Switcher._auth();
    }
  }

  async validate() {
    let errors = [];

    if (!Switcher.context.apiKey) {
      errors.push('Missing API Key field');
    }

    if (!Switcher.context.component) {
      errors.push('Missing component field');
    }

    if (!this.key) {
      errors.push('Missing key field');
    }

    await this._executeApiValidation();
    if (!Switcher.context.token) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  async isItOn(key, input, showReason = false) {
    let result;
    this._validateArgs(key, input);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this.key);
    if (bypassKey) {
      return bypassKey.getValue();
    } 
    
    // verify if query from snapshot
    if (Switcher.options.offline) {
      result = this._executeOfflineCriteria();
    } else {
      await this.validate();
      if (Switcher.context.token === 'SILENT')
        result = this._executeOfflineCriteria();
      else
        result = await this._executeOnlineCriteria(showReason);
    }

    return result;
  }

  throttle(delay) {
    this._delay = delay;

    if (delay > 0)
      Switcher.options.logger = true;

    return this;
  }

  async _executeOnlineCriteria(showReason) {
    if (!this._useSync())
      return this._executeAsyncOnlineCriteria(showReason);

    const responseCriteria = await services.checkCriteria(
      Switcher.context, this.key, this.input, showReason);
    
    if (Switcher.options.logger) 
      ExecutionLogger.add(this.key, this.input, responseCriteria);

    return responseCriteria.result;
  }

  async _executeAsyncOnlineCriteria(showReason) {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;
      services.checkCriteria(Switcher.context, this.key, this.input, showReason)
        .then(response => ExecutionLogger.add(this.key, this.input, response));
    }

    return ExecutionLogger.getExecution(this.key, this.input).response.result;
  }

  async _executeApiValidation() {
    if (this._useSync()) {
      if (await Switcher._checkHealth() && 
        (!Switcher.context.exp || Date.now() > (Switcher.context.exp * 1000))) {
          await this.prepare(this.key, this.input);
      }
    }
  }

  _executeOfflineCriteria() {
    const response = checkCriteriaOffline(
      this.key, this.input, Switcher.snapshot);

    if (Switcher.options.logger) 
      ExecutionLogger.add(this.key, response);

    return response.result;
  }

  _validateArgs(key, input) {
    if (key) { this.key = key; }
    if (input) { this.input = input; }
  }

  _useSync() {
    return this._delay == 0 || !ExecutionLogger.getExecution(this.key, this.input);
  }

}

module.exports = { 
  Switcher,
  checkDate,
  checkNetwork,
  checkNumeric,
  checkRegex,
  checkTime,
  checkValue
};