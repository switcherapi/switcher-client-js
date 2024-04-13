import Bypasser from './lib/bypasser/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import TimedMatch from './lib/utils/timed-match/index.js';
import DateMoment from './lib/utils/datemoment.js';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.js';
import { loadDomain, validateSnapshot, checkSwitchersLocal } from './lib/snapshot.js';
import { SnapshotNotFoundError } from './lib/exceptions/index.js';
import * as services from './lib/remote.js';
import checkCriteriaLocal from './lib/resolver.js';
import { writeFileSync, watchFile, unwatchFile } from 'fs';
import { 
  DEFAULT_ENVIRONMENT, 
  DEFAULT_LOCAL, 
  DEFAULT_LOGGER, 
  DEFAULT_REGEX_MAX_BLACKLISTED, 
  DEFAULT_REGEX_MAX_TIME_LIMIT, 
  DEFAULT_TEST_MODE,
  SWITCHER_OPTIONS 
} from './lib/constants.js';

export class Switcher {

  constructor() {
    this._delay = 0;
    this._nextRun = 0;
    this._input = undefined;
    this._key = '';
    this._forceRemote = false;
    this._showDetail = false;
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
      local: options?.local != undefined ? options.local : DEFAULT_LOCAL,
      logger: options?.logger != undefined ? options.logger : DEFAULT_LOGGER
    };

    if (options) {
      Switcher._buildOptions(options);
    }
  }

  static _buildOptions(options) {
    if (SWITCHER_OPTIONS.CERT_PATH in options && options.certPath) {
      services.setCerts(options.certPath);
    }

    if (SWITCHER_OPTIONS.SILENT_MODE in options && options.silentMode) {
      this._initSilentMode(options.silentMode);
    }

    if (SWITCHER_OPTIONS.SNAPSHOT_AUTO_UPDATE_INTERVAL in options) {
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
        writeFileSync(`${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`, snapshot);
      }

      Switcher.snapshot = JSON.parse(snapshot);
      return true;
    }

    return false;
  }

  static async loadSnapshot(watchSnapshot = false, fetchRemote = false) {
    Switcher.snapshot = loadDomain(
      Switcher.options.snapshotLocation || '', 
      Switcher.context.environment
    );

    if (Switcher.snapshot.data.domain.version == 0 && 
        (fetchRemote || !Switcher.options.local))
      await Switcher.checkSnapshot();

    if (watchSnapshot) {
      Switcher.watchSnapshot();
    }

    return Switcher.snapshot?.data.domain.version || 0;
  }

  static watchSnapshot(success = () => {}, error = () => {}) {
    if (Switcher.testEnabled || !Switcher.options.snapshotLocation?.length) {
      return error(new Error('Watch Snapshot cannot be used in test mode or without a snapshot location'));
    }

    const snapshotFile = `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;
    watchFile(snapshotFile, () => {
      try {
        Switcher.snapshot = loadDomain(Switcher.options.snapshotLocation, Switcher.context.environment);
        success();
      } catch (e) {
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
    unwatchFile(snapshotFile);
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
    if (Switcher.options.local && Switcher.snapshot) {
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
    if (SWITCHER_OPTIONS.REGEX_MAX_BLACK_LIST in options) {
      TimedMatch.setMaxBlackListed(options.regexMaxBlackList || DEFAULT_REGEX_MAX_BLACKLISTED);
    }

    if (SWITCHER_OPTIONS.REGEX_MAX_TIME_LIMIT in options) {
      TimedMatch.setMaxTimeLimit(options.regexMaxTimeLimit || DEFAULT_REGEX_MAX_TIME_LIMIT);
    }

    const hasRegexSafeOption = SWITCHER_OPTIONS.REGEX_SAFE in options;
    if (!hasRegexSafeOption || (hasRegexSafeOption && options.regexSafe)) {
      TimedMatch.initializeWorker();
    }
  }

  static async _auth() {
    const response = await services.auth(Switcher.context);
    Switcher.context.token = response.token;
    Switcher.context.exp = response.exp;
  }

  static _checkHealth() {
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

    if (!Switcher.options.local || this._forceRemote) {
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

  async isItOn(key, input) {
    let result;
    this._validateArgs(key, input);
    
    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse();
      return this._showDetail ? response : response.result;
    } 
    
    // verify if query from snapshot
    if (Switcher.options.local && !this._forceRemote) {
      result = await this._executeLocalCriteria();
    } else {
      try {
        await this.validate();
        if (Switcher.context.token === 'SILENT') {
          result = await this._executeLocalCriteria();
        } else {
          result = await this._executeRemoteCriteria();
        }
      } catch (e) {
        if (Switcher.options.silentMode) {
          Switcher._updateSilentToken();
          return this._executeLocalCriteria();
        }
        
        throw e;
      }
    }
    
    return result;
  }

  throttle(delay) {
    this._delay = delay;

    if (delay > 0) {
      Switcher.options.logger = true;
    }

    return this;
  }

  remote(forceRemote = true) {
    if (!Switcher.options.local) {
      throw new Error('Local mode is not enabled');
    }
    
    this._forceRemote = forceRemote;
    return this;
  }

  detail(showDetail = true) {
    this._showDetail = showDetail;
    return this;
  }

  async _executeRemoteCriteria() {
    let responseCriteria;

    if (this._useSync()) {
      responseCriteria = await services.checkCriteria(
        Switcher.context, this._key, this._input, this._showDetail);
      
      if (Switcher.options.logger) {
        ExecutionLogger.add(responseCriteria, this._key, this._input);
      }
    } else {
      responseCriteria = this._executeAsyncRemoteCriteria(this._showDetail);
    }
    
    return this._showDetail ? responseCriteria : responseCriteria.result;
  }

  _executeAsyncRemoteCriteria(showDetail) {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;
      services.checkCriteria(Switcher.context, this._key, this._input, showDetail)
        .then(response => ExecutionLogger.add(response, this._key, this._input));
    }

    const executionLog = ExecutionLogger.getExecution(this._key, this._input);
    return executionLog.response;
  }

  async _executeApiValidation() {
    if (!this._useSync()) {
      return;
    }

    Switcher._checkHealth();
    if (Switcher._isTokenExpired()) {
      await this.prepare(this._key, this._input);
    }
  }

  async _executeLocalCriteria() {
    const response = await checkCriteriaLocal(
      this._key, this._input, Switcher.snapshot);

    if (Switcher.options.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    if (this._showDetail) {
      return response;
    }

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