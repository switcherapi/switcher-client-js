import Bypasser from './lib/bypasser/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import TimedMatch from './lib/utils/timed-match/index.js';
import DateMoment from './lib/utils/datemoment.js';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.js';
import { loadDomain, validateSnapshot, checkSwitchersLocal } from './lib/snapshot.js';
import { SnapshotNotFoundError } from './lib/exceptions/index.js';
import * as remote from './lib/remote.js';
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

  static #options;
  static #context;
  #delay;
  #nextRun;
  #input;
  #key;
  #forceRemote;
  #showDetail;

  constructor() {
    this.#delay = 0;
    this.#nextRun = 0;
    this.#input = undefined;
    this.#key = '';
    this.#forceRemote = false;
    this.#showDetail = false;
  }

  static buildContext(context, options) {
    this.testEnabled = DEFAULT_TEST_MODE;

    this.snapshot = undefined;
    this.#context = context;
    this.#context.url = context.url;
    this.#context.environment = context.environment || DEFAULT_ENVIRONMENT;

    // Default values
    this.#options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation,
      local: options?.local != undefined ? options.local : DEFAULT_LOCAL,
      logger: options?.logger != undefined ? options.logger : DEFAULT_LOGGER
    };

    if (options) {
      Switcher.#buildOptions(options);
    }
  }

  static #buildOptions(options) {
    if (SWITCHER_OPTIONS.CERT_PATH in options && options.certPath) {
      remote.setCerts(options.certPath);
    }

    if (SWITCHER_OPTIONS.SILENT_MODE in options && options.silentMode) {
      this.#initSilentMode(options.silentMode);
    }

    if (SWITCHER_OPTIONS.SNAPSHOT_AUTO_UPDATE_INTERVAL in options) {
      this.#options.snapshotAutoUpdateInterval = options.snapshotAutoUpdateInterval;
      this.scheduleSnapshotAutoUpdate();
    }

    this.#initTimedMatch(options);
  }

  static factory() {
    return new Switcher();
  }

  static async checkSnapshot() {
    if (!Switcher.snapshot) {
      throw new SnapshotNotFoundError('Snapshot is not loaded. Use Switcher.loadSnapshot()');
    }

    if (!Switcher.#context.exp || Date.now() > (Switcher.#context.exp*1000)) {
      await Switcher.#auth();
    }

    const snapshot = await validateSnapshot(
      Switcher.#context,
      Switcher.snapshot.data.domain.version
    );
    
    if (snapshot) {
      if (Switcher.#options.snapshotLocation?.length) {
        writeFileSync(`${Switcher.#options.snapshotLocation}${Switcher.#context.environment}.json`, snapshot);
      }

      Switcher.snapshot = JSON.parse(snapshot);
      return true;
    }

    return false;
  }

  static async loadSnapshot(watchSnapshot = false, fetchRemote = false) {
    Switcher.snapshot = loadDomain(
      Switcher.#options.snapshotLocation || '', 
      Switcher.#context.environment
    );

    if (Switcher.snapshot.data.domain.version == 0 && 
        (fetchRemote || !Switcher.#options.local))
      await Switcher.checkSnapshot();

    if (watchSnapshot) {
      Switcher.watchSnapshot();
    }

    return Switcher.snapshot?.data.domain.version || 0;
  }

  static watchSnapshot(success = () => {}, error = () => {}) {
    if (Switcher.testEnabled || !Switcher.#options.snapshotLocation?.length) {
      return error(new Error('Watch Snapshot cannot be used in test mode or without a snapshot location'));
    }

    const snapshotFile = `${Switcher.#options.snapshotLocation}${Switcher.#context.environment}.json`;
    watchFile(snapshotFile, () => {
      try {
        Switcher.snapshot = loadDomain(Switcher.#options.snapshotLocation, Switcher.#context.environment);
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

    const snapshotFile = `${Switcher.#options.snapshotLocation}${Switcher.#context.environment}.json`;
    Switcher.snapshot = undefined;
    unwatchFile(snapshotFile);
  }

  static scheduleSnapshotAutoUpdate(interval, callback) {
    if (interval) {
      Switcher.#options.snapshotAutoUpdateInterval = interval;
    }

    if (Switcher.#options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(
        Switcher.#options.snapshotAutoUpdateInterval, this.checkSnapshot, callback);
    }
  }

  static terminateSnapshotAutoUpdate() {
    SnapshotAutoUpdater.terminate();
  }

  static async checkSwitchers(switcherKeys) {
    if (Switcher.#options.local && Switcher.snapshot) {
      checkSwitchersLocal(Switcher.snapshot, switcherKeys);
    } else {
      await Switcher._checkSwitchersRemote(switcherKeys);
    }
  }

  static async _checkSwitchersRemote(switcherKeys) {
    try {
      await Switcher.#auth();
      await remote.checkSwitchers(Switcher.#context.url, Switcher.#context.token, switcherKeys);
    } catch (e) {
      if (Switcher.#options.silentMode) {
        checkSwitchersLocal(Switcher.snapshot, switcherKeys);
      } else {
        throw e;
      }
    }
  }

  static #initSilentMode(silentMode) {
    Switcher.#options.retryTime = silentMode.slice(0, -1);
    Switcher.#options.retryDurationIn = silentMode.slice(-1);

    Switcher.#options.silentMode = silentMode;
    Switcher.loadSnapshot();
  }

  static #initTimedMatch(options) {
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

  static async #auth() {
    const response = await remote.auth(Switcher.#context);
    Switcher.#context.token = response.token;
    Switcher.#context.exp = response.exp;
  }

  static #checkHealth() {
    if (Switcher.#context.token !== 'SILENT') {
      return;
    }

    if (Switcher.#isTokenExpired()) {
      Switcher.#updateSilentToken();
      remote.checkAPIHealth(Switcher.#context.url || '').then((isAlive) => {
        if (isAlive) {
          Switcher.#auth();
        }
      });
    }
  }

  static #updateSilentToken() {
    const expirationTime = new DateMoment(new Date())
      .add(Switcher.#options.retryTime, Switcher.#options.retryDurationIn).getDate();

    Switcher.#context.token = 'SILENT';
    Switcher.#context.exp = Math.round(expirationTime.getTime() / 1000);
  }

  static #isTokenExpired() {
    return !Switcher.#context.exp || Date.now() > (Switcher.#context.exp * 1000);
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

  static testMode(testEnabled = true) {
    Switcher.testEnabled = testEnabled;
  }

  async prepare(key, input) {
    this.#key = key;

    if (input) { this.#input = input; }

    if (!Switcher.#options.local || this.#forceRemote) {
      await Switcher.#auth();
    }
  }

  async validate() {
    let errors = [];

    if (!Switcher.#context.url) {
      errors.push('Missing API url field');
    }

    if (!Switcher.#context.apiKey) {
      errors.push('Missing API Key field');
    }

    if (!Switcher.#context.component) {
      errors.push('Missing component field');
    }

    if (!this.#key) {
      errors.push('Missing key field');
    }

    await this.#executeApiValidation();
    if (!Switcher.#context.token) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  async isItOn(key, input) {
    let result;
    this.#validateArgs(key, input);
    
    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this.#key);
    if (bypassKey) {
      const response = bypassKey.getResponse();
      return this.#showDetail ? response : response.result;
    } 
    
    // verify if query from snapshot
    if (Switcher.#options.local && !this.#forceRemote) {
      result = await this._executeLocalCriteria();
    } else {
      try {
        await this.validate();
        if (Switcher.#context.token === 'SILENT') {
          result = await this._executeLocalCriteria();
        } else {
          result = await this._executeRemoteCriteria();
        }
      } catch (e) {
        if (Switcher.#options.silentMode) {
          Switcher.#updateSilentToken();
          return this._executeLocalCriteria();
        }
        
        throw e;
      }
    }
    
    return result;
  }

  throttle(delay) {
    this.#delay = delay;

    if (delay > 0) {
      Switcher.#options.logger = true;
    }

    return this;
  }

  remote(forceRemote = true) {
    if (!Switcher.#options.local) {
      throw new Error('Local mode is not enabled');
    }
    
    this.#forceRemote = forceRemote;
    return this;
  }

  detail(showDetail = true) {
    this.#showDetail = showDetail;
    return this;
  }

  async _executeRemoteCriteria() {
    let responseCriteria;

    if (this.#useSync()) {
      responseCriteria = await remote.checkCriteria(
        Switcher.#context, this.#key, this.#input, this.#showDetail);
      
      if (Switcher.#options.logger) {
        ExecutionLogger.add(responseCriteria, this.#key, this.#input);
      }
    } else {
      responseCriteria = this._executeAsyncRemoteCriteria();
    }
    
    return this.#showDetail ? responseCriteria : responseCriteria.result;
  }

  _executeAsyncRemoteCriteria() {
    if (this.#nextRun < Date.now()) {
      this.#nextRun = Date.now() + this.#delay;

      if (Switcher.#isTokenExpired()) {
        this.prepare(this.#key, this.#input)
          .then(() => this.#executeAsyncCheckCriteria());
      } else {
        this.#executeAsyncCheckCriteria();
      }
    }

    const executionLog = ExecutionLogger.getExecution(this.#key, this.#input);
    return executionLog.response;
  }

  #executeAsyncCheckCriteria() {
    remote.checkCriteria(Switcher.#context, this.#key, this.#input, this.#showDetail)
      .then(response => ExecutionLogger.add(response, this.#key, this.#input));
  }

  async #executeApiValidation() {
    if (!this.#useSync()) {
      return;
    }

    Switcher.#checkHealth();
    if (Switcher.#isTokenExpired()) {
      await this.prepare(this.#key, this.#input);
    }
  }

  async _executeLocalCriteria() {
    const response = await checkCriteriaLocal(
      this.#key, this.#input, Switcher.snapshot);

    if (Switcher.#options.logger) {
      ExecutionLogger.add(response, this.#key, this.#input);
    }

    if (this.#showDetail) {
      return response;
    }

    return response.result;
  }

  #validateArgs(key, input) {
    if (key) { this.#key = key; }
    if (input) { this.#input = input; }
  }

  #useSync() {
    return this.#delay == 0 || !ExecutionLogger.getExecution(this.#key, this.#input);
  }

}