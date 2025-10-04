import { writeFileSync } from 'node:fs';

import * as remote from './lib/remote.js';
import * as util from './lib/utils/index.js';
import Bypasser from './lib/bypasser/index.js';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_LOCAL,
  DEFAULT_LOGGER,
  DEFAULT_REGEX_MAX_BLACKLISTED,
  DEFAULT_REGEX_MAX_TIME_LIMIT,
  DEFAULT_FREEZE,
  DEFAULT_TEST_MODE,
  SWITCHER_OPTIONS
} from './lib/constants.js';
import TimedMatch from './lib/utils/timed-match/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.js';
import { ClientError } from './lib/exceptions/index.js';
import { loadDomain, validateSnapshot, checkSwitchersLocal } from './lib/snapshot.js';
import { Switcher } from './switcher.js';
import { Auth } from './lib/remoteAuth.js';
import { GlobalOptions } from './lib/globals/globalOptions.js';
import { GlobalSnapshot } from './lib/globals/globalSnapshot.js';
import { SnapshotWatcher } from './lib/snapshotWatcher.js';

export class Client {
  static #snapshotWatcher = new SnapshotWatcher();
  static #testEnabled;
  static #context;

  static buildContext(context, options) {
    this.#context = context;
    this.#testEnabled = DEFAULT_TEST_MODE;
    this.#context.environment = util.get(context.environment, DEFAULT_ENVIRONMENT);

    // Default values
    GlobalSnapshot.clear();
    GlobalOptions.init({
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation,
      local: util.get(options?.local, DEFAULT_LOCAL),
      freeze: util.get(options?.freeze, DEFAULT_FREEZE),
      logger: util.get(options?.logger, DEFAULT_LOGGER)
    });

    if (options) {
      Client.#buildOptions(options);
    }

    // Initialize Auth
    Auth.init(this.#context);
  }

  static #buildOptions(options) {
    remote.removeAgent();

    const optionsHandler = {
      [SWITCHER_OPTIONS.CERT_PATH]: (val) => val && remote.setCerts(val),
      [SWITCHER_OPTIONS.SILENT_MODE]: (val) => val && this.#initSilentMode(val),
      [SWITCHER_OPTIONS.RESTRICT_RELAY]: (val) => {
        GlobalOptions.updateOptions({ restrictRelay: val });
      },
      [SWITCHER_OPTIONS.SNAPSHOT_AUTO_UPDATE_INTERVAL]: (val) => {
        GlobalOptions.updateOptions({ snapshotAutoUpdateInterval: val });
        this.scheduleSnapshotAutoUpdate();
      },
      [SWITCHER_OPTIONS.SNAPSHOT_WATCHER]: (val) => {
        GlobalOptions.updateOptions({ snapshotWatcher: val });
        this.watchSnapshot();
      }
    };

    for (const [key, handler] of Object.entries(optionsHandler)) {
      if (key in options) {
        handler(options[key]);
      }
    }

    this.#initTimedMatch(options);
  }

  static #initSilentMode(silentMode) {
    Auth.setRetryOptions(silentMode);

    GlobalOptions.updateOptions({ silentMode });
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
    return new Switcher(util.get(key, ''))
      .restrictRelay(GlobalOptions.restrictRelay);
  }

  static async checkSnapshot() {
    if (!GlobalSnapshot.snapshot) {
      throw new ClientError('Snapshot is not loaded. Use Client.loadSnapshot()');
    }

    if (Auth.isTokenExpired()) {
      await Auth.auth();
    }

    const snapshot = await validateSnapshot(
      Client.#context,
      GlobalSnapshot.snapshot.data.domain.version
    );

    if (snapshot) {
      if (GlobalOptions.snapshotLocation?.length) {
        writeFileSync(`${GlobalOptions.snapshotLocation}/${Client.#context.environment}.json`, snapshot);
      }

      GlobalSnapshot.init(JSON.parse(snapshot));
      return true;
    }

    return false;
  }

  static async loadSnapshot(options = {}) {
    const { fetchRemote = false, watchSnapshot = false } = options;

    GlobalSnapshot.init(loadDomain(
      util.get(GlobalOptions.snapshotLocation, ''),
      util.get(Client.#context.environment, DEFAULT_ENVIRONMENT)
    ));

    if (this.#isCheckSnapshotAvailable(fetchRemote)) {
      await Client.checkSnapshot();
    }

    if (watchSnapshot) {
      Client.watchSnapshot();
    }

    return GlobalSnapshot.snapshot?.data.domain.version || 0;
  }

  /**
   * Checks if the snapshot is available to be checked.
   *
   * Snapshots with version 0 are required to be checked if either:
   * - fetchRemote is true, meaning it will fetch the latest snapshot from the API.
   * - GlobalOptions.local is false, meaning it will not use the local snapshot.
   */
  static #isCheckSnapshotAvailable(fetchRemote) {
    return GlobalSnapshot.snapshot?.data.domain.version == 0 && (fetchRemote || !GlobalOptions.local);
  }

  static watchSnapshot(callback = {}) {
    const { reject = () => { } } = callback;

    if (Client.#testEnabled || !GlobalOptions.snapshotLocation?.length) {
      return reject(new Error('Watch Snapshot cannot be used in test mode or without a snapshot location'));
    }

    Client.#snapshotWatcher.watchSnapshot(
      util.get(Client.#context.environment, DEFAULT_ENVIRONMENT),
      callback
    );
  }

  static unloadSnapshot() {
    if (Client.#testEnabled) {
      return;
    }

    GlobalSnapshot.clear();
    Client.#snapshotWatcher.stopWatching();
  }

  static scheduleSnapshotAutoUpdate(interval, callback = {}) {
    const { success = () => { }, reject = () => { } } = callback;

    if (interval) {
      GlobalOptions.updateOptions({ snapshotAutoUpdateInterval: interval });
    }

    if (GlobalOptions.snapshotAutoUpdateInterval && GlobalOptions.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(
        GlobalOptions.snapshotAutoUpdateInterval,
        this.checkSnapshot,
        success,
        reject
      );
    }
  }

  static terminateSnapshotAutoUpdate() {
    SnapshotAutoUpdater.terminate();
  }

  static async checkSwitchers(switcherKeys) {
    if (GlobalOptions.local && GlobalSnapshot.snapshot) {
      checkSwitchersLocal(GlobalSnapshot.snapshot, switcherKeys);
    } else {
      await Client._checkSwitchersRemote(switcherKeys);
    }
  }

  static async _checkSwitchersRemote(switcherKeys) {
    try {
      await Auth.auth();
      await remote.checkSwitchers(switcherKeys);
    } catch (e) {
      if (GlobalOptions.silentMode) {
        checkSwitchersLocal(GlobalSnapshot.snapshot, switcherKeys);
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
    Client.#testEnabled = testEnabled;
  }

  static get snapshotVersion() {
    return GlobalSnapshot.snapshot?.data.domain.version || 0;
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