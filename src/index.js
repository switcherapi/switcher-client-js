'use strict';

const Bypasser = require('./lib/bypasser');
const ExecutionLogger = require('./lib/utils/executionLogger');
const TimedMatch = require('./lib/utils/timed-match');
const DateMoment = require('./lib/utils/datemoment');
const SnapshotAutoUpdater = require('./lib/utils/snapshotAutoUpdater');
const { loadDomain, validateSnapshot, checkSwitchersLocal } = require('./lib/snapshot');
const { SnapshotNotFoundError } = require('./lib/exceptions');
const services = require('./lib/remote');
const checkCriteriaOffline = require('./lib/resolver');
const fs = require('fs');

const {
  checkDate,
  checkNetwork,
  checkNumeric,
  checkRegex,
  checkTime,
  checkValue,
  checkPayload
} = require('./lib/middlewares/check');

const DEFAULT_ENVIRONMENT = 'default';
const DEFAULT_OFFLINE = false;
const DEFAULT_LOGGER = false;
const DEFAULT_TEST_MODE = false;

class Switcher {

  constructor() {
    this._delay = 0;
    this._nextRun = 0;
    this._input = undefined;
    this._key = '';
  }

  static buildContext(context, options) {
    this.testEnabled = DEFAULT_TEST_MODE;

    this.snapshot = undefined;
    this.context = context;
    this.context.url = context.url;
    this.context.environment = context.environment || DEFAULT_ENVIRONMENT;

    // Default values
    this.options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation,
      offline: options?.offline != undefined ? options.offline : DEFAULT_OFFLINE,
      logger: options?.logger != undefined ? options.logger : DEFAULT_LOGGER
    };

    if (options) {
      Switcher._buildOptions(options);
    }
  }

  static _buildOptions(options) {
    if ('certPath' in options && options.certPath) {
      services.setCerts(options.certPath);
    }

    if ('silentMode' in options && options.silentMode) {
      this._initSilentMode(options.silentMode);
    }

    if ('snapshotAutoUpdateInterval' in options) {
      this.options.snapshotAutoUpdateInterval = options.snapshotAutoUpdateInterval;
      this.scheduleSnapshotAutoUpdate();
    }

    this._initTimedMatch(options);
  }

  static factory() {
    return new Switcher();
  }

  static async checkSnapshot() {
    if (!Switcher.snapshot) {
      throw new SnapshotNotFoundError('Snapshot is not loaded. Use Switcher.loadSnapshot()');
    }

    if (!Switcher.context.exp || Date.now() > (Switcher.context.exp*1000)) {
      await Switcher._auth();
    }

    const snapshot = await validateSnapshot(
      Switcher.context,
      Switcher.snapshot.data.domain.version
    );
    
    if (snapshot) {
      if (Switcher.options.snapshotLocation?.length) {
        fs.writeFileSync(`${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`, snapshot);
      }

      Switcher.snapshot = JSON.parse(snapshot);
      return true;
    }

    return false;
  }

  static async loadSnapshot(watchSnapshot = false, fecthOnline = false) {
    Switcher.snapshot = loadDomain(
      Switcher.options.snapshotLocation || '', 
      Switcher.context.environment
    );

    if (Switcher.snapshot.data.domain.version == 0 && 
        (fecthOnline || !Switcher.options.offline))
      await Switcher.checkSnapshot();

    if (watchSnapshot) {
      Switcher.watchSnapshot();
    }

    return Switcher.snapshot?.data.domain.version || 0;
  }

  static watchSnapshot(success, error) {
    if (Switcher.testEnabled || !Switcher.options.snapshotLocation?.length) {
      return;
    }

    const snapshotFile = `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;
    fs.watchFile(snapshotFile, () => {
      try {
        Switcher.snapshot = loadDomain(Switcher.options.snapshotLocation, Switcher.context.environment);
        if (success)
          success();
      } catch (e) {
        if (error)
          error(e);
      }
    });
  }

  static unloadSnapshot() {
    if (Switcher.testEnabled) {
      return;
    }

    const snapshotFile = `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;
    Switcher.snapshot = undefined;
    fs.unwatchFile(snapshotFile);
  }

  static scheduleSnapshotAutoUpdate(interval, callback) {
    if (interval) {
      Switcher.options.snapshotAutoUpdateInterval = interval;
    }

    if (Switcher.options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(
        Switcher.options.snapshotAutoUpdateInterval, this.checkSnapshot, callback);
    }
  }

  static terminateSnapshotAutoUpdate() {
    SnapshotAutoUpdater.terminate();
  }

  static async checkSwitchers(switcherKeys) {
    if (Switcher.options.offline && Switcher.snapshot) {
      checkSwitchersLocal(Switcher.snapshot, switcherKeys);
    } else {
      await Switcher._checkSwitchersRemote(switcherKeys);
    }
  }

  static async _checkSwitchersRemote(switcherKeys) {
    try {
      await Switcher._auth();
      await services.checkSwitchersRemote(Switcher.context.url, Switcher.context.token, switcherKeys);
    } catch (e) {
      if (Switcher.options.silentMode) {
        checkSwitchersLocal(Switcher.snapshot, switcherKeys);
      } else {
        throw e;
      }
    }
  }

  static _initSilentMode(silentMode) {
    Switcher.options.retryTime = silentMode.slice(0, -1);
    Switcher.options.retryDurationIn = silentMode.slice(-1);

    Switcher.options.silentMode = silentMode;
    Switcher.loadSnapshot();
  }

  static _initTimedMatch(options) {
    if ('regexMaxBlackList' in options) {
      TimedMatch.setMaxBlackListed(options.regexMaxBlackList);
    }

    if ('regexMaxTimeLimit' in options) {
      TimedMatch.setMaxTimeLimit(options.regexMaxTimeLimit);
    }

    const hasRegexSafeOption = 'regexSafe' in options;
    if (!hasRegexSafeOption || (hasRegexSafeOption && options.regexSafe)) {
      TimedMatch.initializeWorker();
    }
  }

  static async _auth() {
    const response = await services.auth(Switcher.context);
    Switcher.context.token = response.token;
    Switcher.context.exp = response.exp;
  }

  static async _checkHealth() {
    if (Switcher.context.token !== 'SILENT') {
      return;
    }

    if (Switcher._isTokenExpired()) {
      Switcher._updateSilentToken();
      services.checkAPIHealth(Switcher.context.url || '').then((isAlive) => {
        if (isAlive) {
          Switcher._auth();
        }
      });
    }
  }

  static _updateSilentToken() {
    const expirationTime = new DateMoment(new Date())
      .add(Switcher.options.retryTime, Switcher.options.retryDurationIn).getDate();

    Switcher.context.token = 'SILENT';
    Switcher.context.exp = Math.round(expirationTime.getTime() / 1000);
  }

  static _isTokenExpired() {
    return !Switcher.context.exp || Date.now() > (Switcher.context.exp * 1000);
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

  static clearLogger() {
    ExecutionLogger.clearLogger();
  }

  static setTestEnabled() {
    Switcher.testEnabled = true;
  }

  static setTestDisabled() {
    Switcher.testEnabled = false;
  }

  async prepare(key, input) {
    this._key = key;

    if (input) { this._input = input; }

    if (!Switcher.options.offline) {
      await Switcher._auth();
    }
  }

  async validate() {
    let errors = [];

    if (!Switcher.context.url) {
      errors.push('Missing API url field');
    }

    if (!Switcher.context.apiKey) {
      errors.push('Missing API Key field');
    }

    if (!Switcher.context.component) {
      errors.push('Missing component field');
    }

    if (!this._key) {
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
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      return bypassKey.getValue();
    } 
    
    // verify if query from snapshot
    if (Switcher.options.offline) {
      result = await this._executeOfflineCriteria();
    } else {
      try {
        await this.validate();
        if (Switcher.context.token === 'SILENT') {
          result = await this._executeOfflineCriteria();
        } else {
          result = await this._executeOnlineCriteria(showReason);
        }
      } catch (e) {
        if (Switcher.options.silentMode) {
          Switcher._updateSilentToken();
          return this._executeOfflineCriteria();
        }

        throw e;
      }
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
      Switcher.context, this._key, this._input, showReason);
    
    if (Switcher.options.logger) 
      ExecutionLogger.add(responseCriteria, this._key, this._input);

    return responseCriteria.result;
  }

  async _executeAsyncOnlineCriteria(showReason) {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;
      services.checkCriteria(Switcher.context, this._key, this._input, showReason)
        .then(response => ExecutionLogger.add(response, this._key, this._input));
    }

    return ExecutionLogger.getExecution(this._key, this._input).response.result;
  }

  async _executeApiValidation() {
    if (!this._useSync()) {
      return;
    }

    await Switcher._checkHealth();
    if (Switcher._isTokenExpired()) {
        await this.prepare(this._key, this._input);
    }
  }

  async _executeOfflineCriteria() {
    const response = await checkCriteriaOffline(
      this._key, this._input, Switcher.snapshot);

    if (Switcher.options.logger) 
      ExecutionLogger.add(response, this._key, this._input);

    return response.result;
  }

  _validateArgs(key, input) {
    if (key) { this._key = key; }
    if (input) { this._input = input; }
  }

  _useSync() {
    return this._delay == 0 || !ExecutionLogger.getExecution(this._key, this._input);
  }

}

module.exports = { 
  Switcher,
  checkDate,
  checkNetwork,
  checkNumeric,
  checkRegex,
  checkTime,
  checkValue,
  checkPayload
};