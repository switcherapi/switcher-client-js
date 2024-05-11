import { writeFileSync, watchFile, unwatchFile } from 'node:fs';

import * as remote from './lib/remote.js';
import * as util from './lib/utils/index.js';
import Bypasser from './lib/bypasser/index.js';
import { 
  DEFAULT_ENVIRONMENT, 
  DEFAULT_LOCAL, 
  DEFAULT_LOGGER, 
  DEFAULT_REGEX_MAX_BLACKLISTED, 
  DEFAULT_REGEX_MAX_TIME_LIMIT, 
  DEFAULT_TEST_MODE,
  SWITCHER_OPTIONS 
} from './lib/constants.js';
import TimedMatch from './lib/utils/timed-match/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.js';
import { SnapshotNotFoundError } from './lib/exceptions/index.js';
import { loadDomain, validateSnapshot, checkSwitchersLocal } from './lib/snapshot.js';
import { Switcher } from './switcher.js';
import { Auth } from './lib/remote-auth.js';

export class Client {

  static #options;
  static #context;
  static #snapshot;

  static buildContext(context, options) {
    this.testEnabled = DEFAULT_TEST_MODE;

    this.#snapshot = undefined;
    this.#context = context;
    this.#context.environment = util.get(context.environment, DEFAULT_ENVIRONMENT);

    // Default values
    this.#options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation,
      local: util.get(options?.local, DEFAULT_LOCAL),
      logger: util.get(options?.logger, DEFAULT_LOGGER)
    };

    if (options) {
        Client.#buildOptions(options);
    }
    
    // Initialize Auth
    Auth.init(this.#context);
  }

  static #buildOptions(options) {
    remote.removeAgent();
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

  static #initSilentMode(silentMode) {
    Auth.setRetryOptions(silentMode);

    Client.#options.silentMode = silentMode;
    Client.loadSnapshot();
  }
  
  static #initTimedMatch(options) {
    if (SWITCHER_OPTIONS.REGEX_MAX_BLACK_LIST in options) {
      TimedMatch.setMaxBlackListed(util.get(options.regexMaxBlackList, DEFAULT_REGEX_MAX_BLACKLISTED));
    }

    if (SWITCHER_OPTIONS.REGEX_MAX_TIME_LIMIT in options) {
      TimedMatch.setMaxTimeLimit(util.get(options.regexMaxTimeLimit, DEFAULT_REGEX_MAX_TIME_LIMIT));
    }

    const hasRegexSafeOption = SWITCHER_OPTIONS.REGEX_SAFE in options;
    if (!hasRegexSafeOption || (hasRegexSafeOption && options.regexSafe)) {
      TimedMatch.initializeWorker();
    }
  }

  static getSwitcher(key) {
    return new Switcher(util.get(key, ''));
  }

  static async checkSnapshot() {
    if (!Client.#snapshot) {
      throw new SnapshotNotFoundError('Snapshot is not loaded. Use Client.loadSnapshot()');
    }

    if (Auth.isTokenExpired()) {
      await Auth.auth();
    }
    
    const snapshot = await validateSnapshot(
        Client.#context,
        Client.#snapshot.data.domain.version
    );
    
    if (snapshot) {
      if (Client.#options.snapshotLocation?.length) {
        writeFileSync(`${Client.#options.snapshotLocation}/${Client.#context.environment}.json`, snapshot);
      }

      Client.#snapshot = JSON.parse(snapshot);
      return true;
    }

    return false;
  }

  static async loadSnapshot(watchSnapshot = false, fetchRemote = false) {
    Client.#snapshot = loadDomain(
      util.get(Client.#options.snapshotLocation, ''), 
      util.get(Client.#context.environment, DEFAULT_ENVIRONMENT)
    );

    if (Client.#snapshot.data.domain.version == 0 && 
        (fetchRemote || !Client.#options.local)) {
      await Client.checkSnapshot();
    }

    if (watchSnapshot) {
        Client.watchSnapshot();
    }

    return Client.#snapshot?.data.domain.version || 0;
  }

  static watchSnapshot(success = () => {}, error = () => {}) {
    if (Client.testEnabled || !Client.#options.snapshotLocation?.length) {
      return error(new Error('Watch Snapshot cannot be used in test mode or without a snapshot location'));
    }

    const snapshotFile = `${Client.#options.snapshotLocation}/${Client.#context.environment}.json`;
    let lastUpdate;
    watchFile(snapshotFile, (listener) => {
      try {
        if (!lastUpdate || listener.ctime > lastUpdate) {
            Client.#snapshot = loadDomain(Client.#options.snapshotLocation, Client.#context.environment);
          success();
        }
      } catch (e) {
        error(e);
      } finally {
        lastUpdate = listener.ctime;
      }
    });
  }

  static unloadSnapshot() {
    if (Client.testEnabled) {
      return;
    }

    const snapshotFile = `${Client.#options.snapshotLocation}${Client.#context.environment}.json`;
    Client.#snapshot = undefined;
    unwatchFile(snapshotFile);
  }

  static scheduleSnapshotAutoUpdate(interval, callback) {
    if (interval) {
        Client.#options.snapshotAutoUpdateInterval = interval;
    }

    if (Client.#options.snapshotAutoUpdateInterval && Client.#options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(Client.#options.snapshotAutoUpdateInterval, this.checkSnapshot, callback);
    }
  }

  static terminateSnapshotAutoUpdate() {
    SnapshotAutoUpdater.terminate();
  }

  static async checkSwitchers(switcherKeys) {
    if (Client.#options.local && Client.#snapshot) {
      checkSwitchersLocal(Client.#snapshot, switcherKeys);
    } else {
      await Client._checkSwitchersRemote(switcherKeys);
    }
  }

  static async _checkSwitchersRemote(switcherKeys) {
    try {
      await Auth.auth();
      await remote.checkSwitchers(Client.#context.url, Client.#context.token, switcherKeys);
    } catch (e) {
      if (Client.#options.silentMode) {
        checkSwitchersLocal(Client.#snapshot, switcherKeys);
      } else {
        throw e;
      }
    }
  }

  static assume(key) {
    return Bypasser.assume(key);
  }

  static forget(key) {
    return Bypasser.forget(key);
  }

  static subscribeNotifyError(callback) {
    ExecutionLogger.subscribeNotifyError(callback);
  }

  static getLogger(key) {
    return ExecutionLogger.getByKey(key);
  }

  static getExecution(switcher) {
    return ExecutionLogger.getExecution(switcher.key, switcher.input);
  }

  static clearLogger() {
    ExecutionLogger.clearLogger();
  }

  static testMode(testEnabled = true) {
    Client.testEnabled = testEnabled;
  }

  static get options() {
    return Client.#options;
  }

  static get snapshot() {
    return Client.#snapshot;
  }

}

// Type export placeholders

export class SwitcherContext {
  static build() {
    return new SwitcherContext();
  }
}

export class SwitcherOptions {
  static build() {
    return new SwitcherOptions();
  }
}

export class ResultDetail {
  static build() {
    return new ResultDetail();
  }
}