'use strict';

const Bypasser = require('./lib/bypasser');
const ExecutionLogger = require('./lib/utils/executionLogger');
const TimedMatch = require('./lib/utils/timed-match');
const DateMoment = require('./lib/utils/datemoment');
const SnapshotAutoUpdater = require('./lib/utils/snapshotAutoUpdater');
const { loadDomain, validateSnapshot, checkSwitchers } = require('./lib/snapshot');
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
const DEFAULT_SNAPSHOT_LOCATION = './snapshot/';
const DEFAULT_RETRY_TIME = '5m';
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
    this.context = {};
    this.context = context;
    this.context.url = context.url;
    this.context.environment = context.environment || DEFAULT_ENVIRONMENT;

    // Default values
    this.options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation || DEFAULT_SNAPSHOT_LOCATION,
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
    
    if ('silentMode' in options) {
      this.options.silentMode = options.silentMode;
      this.loadSnapshot();
    }

    if ('snapshotAutoUpdateInterval' in options) {
      this.options.snapshotAutoUpdateInterval = options.snapshotAutoUpdateInterval;
      this.scheduleSnapshotAutoUpdate();
    }

    if ('retryAfter' in options) {
      this.options.retryTime = options.retryAfter.slice(0, -1);
      this.options.retryDurationIn = options.retryAfter.slice(-1);
    } else {
      this.options.retryTime = DEFAULT_RETRY_TIME.charAt(0);
      this.options.retryDurationIn = DEFAULT_RETRY_TIME.charAt(1);
    }

    this._initTimedMatch(options);
  }

  static factory() {
    return new Switcher();
  }

  static async checkSnapshot() {
    if (!Switcher.snapshot) 
      return false;

    if (!Switcher.context.exp || Date.now() > (Switcher.context.exp*1000))
      await Switcher._auth();

    const result = await validateSnapshot(
      Switcher.context, 
      Switcher.options.snapshotLocation, 
      Switcher.snapshot.data.domain.version
    );
    
    if (result) {
      Switcher.loadSnapshot();
      return true;
    }

    return false;
  }

  static async loadSnapshot(watchSnapshot, fecthOnline) {
    Switcher.snapshot = loadDomain(Switcher.options.snapshotLocation, Switcher.context.environment);
    if (Switcher.snapshot.data.domain.version == 0 && 
        (fecthOnline || !Switcher.options.offline))
      await Switcher.checkSnapshot();

    if (watchSnapshot)
      Switcher.watchSnapshot();
  }

  static watchSnapshot(success, error) {
    if (Switcher.testEnabled)
      return;

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
    if (Switcher.testEnabled)
      return;

    const snapshotFile = `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;
    Switcher.snapshot = undefined;
    fs.unwatchFile(snapshotFile);
  }

  static scheduleSnapshotAutoUpdate(interval) {
    if (interval) {
      Switcher.options.snapshotAutoUpdateInterval = interval;
    }

    if (Switcher.options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(
        Switcher.options.snapshotAutoUpdateInterval, this.checkSnapshot);
    }
  }

  static terminateSnapshotAutoUpdate() {
    SnapshotAutoUpdater.terminate();
  }

  static async checkSwitchers(switcherKeys) {
    if (Switcher.options.offline && Switcher.snapshot) {
      checkSwitchers(Switcher.snapshot, switcherKeys);
    } else {
      try {
        await Switcher._auth();
        await services.checkSwitchers(Switcher.context.url, Switcher.context.token, switcherKeys);
      } catch (e) {
        if (Switcher.options.silentMode) {
          checkSwitchers(Switcher.snapshot, switcherKeys);
        } else {
          throw e;
        }
      }
    }
  }

  static _initTimedMatch(options) {
    if ('regexMaxBlackList' in options) {
      TimedMatch.setMaxBlackListed(options.regexMaxBlackList);
    }

    if ('regexMaxTimeLimit' in options) {
      TimedMatch.setMaxTimeLimit(options.regexMaxTimeLimit);
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
    
    const responseSilentMode = await services.checkAPIHealth(Switcher.context.url, {
      silentMode: Switcher.options.silentMode,
      retryTime: Switcher.options.retryTime,
      retryDurationIn: Switcher.options.retryDurationIn
    });

    if (responseSilentMode) {
      Switcher.context.token = responseSilentMode.data.token;
      Switcher.context.exp = responseSilentMode.data.exp;
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
        if (Switcher.context.token === 'SILENT')
          result = await this._executeOfflineCriteria();
        else
          result = await this._executeOnlineCriteria(showReason);
      } catch (e) {
        if (Switcher.options.silentMode) {
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
    if (this._useSync()) {
      if (await Switcher._checkHealth() && 
        (!Switcher.context.exp || Date.now() > (Switcher.context.exp * 1000))) {
          await this.prepare(this._key, this._input);
      }
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