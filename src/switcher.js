import Bypasser from './lib/bypasser/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import checkCriteriaLocal from './lib/resolver.js';
import * as remote from './lib/remote.js';
import * as util from './lib/utils/index.js';
import { Auth } from './lib/remoteAuth.js';
import { SwitcherResult } from './lib/result.js';
import { GlobalAuth } from './lib/globals/globalAuth.js';
import { GlobalOptions } from './lib/globals/globalOptions.js';
import { GlobalSnapshot } from './lib/globals/globalSnapshot.js';
import { SwitcherRequest } from './switcherRequest.js';

export class Switcher extends SwitcherRequest {
  constructor(key) {
    super();
    this.#validateArgs(key);
  }

  async prepare(key) {
    this.#validateArgs(key);

    if (!GlobalOptions.local || this._forceRemote) {
      await Auth.auth();
    }
  }

  async validate() {
    let errors = [];

    Auth.isValid();

    if (!this._key) {
      errors.push('Missing key field');
    }

    await this.#executeApiValidation();
    if (!GlobalAuth.token) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  isItOnBool(arg1, arg2) {
    this.detail(false);

    // Handle case where first argument is forceAsync boolean
    if (typeof arg1 === 'boolean') {
      arg2 = arg1;
      arg1 = undefined;
    }

    if (arg2) {
      return Promise.resolve(this.isItOn(arg1));
    }

    return this.isItOn(arg1);
  }

  isItOnDetail(arg1, arg2) {
    this.detail(true);

    // Handle case where first argument is forceAsync boolean
    if (typeof arg1 === 'boolean') {
      arg2 = arg1;
      arg1 = undefined;
    }

    if (arg2) {
      return Promise.resolve(this.isItOn(arg1));
    }

    return this.isItOn(arg1);
  }

  isItOn(key) {
    this.#validateArgs(key);
    
    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this._input, []));
      return this.#transformResult(response);
    }

    // try to get cached result
    const cachedResult = this.#tryCachedResult();
    if (cachedResult) {
      return cachedResult;
    }
    
    return this.#submit();
  }

  scheduleBackgroundRefresh() {
    const now = Date.now();
    
    if (now > this._nextRefreshTime) {
      this._nextRefreshTime = now + this._delay;
      queueMicrotask(async () => {
        try {
          await this.#submit();
        } catch (err) {
          this.#notifyError(err);
        }
      });
    }
  }

  async executeRemoteCriteria() {
    return remote.checkCriteria(
      this._key,
      this._input,
      this._showDetail,
    ).then((responseCriteria) => {
      if (this.#canLog()) {
        ExecutionLogger.add(responseCriteria, this._key, this._input);
      }

      return this.#transformResult(responseCriteria);
    }).catch((err) => {
      const responseCriteria = this.#getDefaultResultOrThrow(err);
      return this.#transformResult(responseCriteria);
    });
  }

  executeLocalCriteria() {
    try {
      const response = checkCriteriaLocal(GlobalSnapshot.snapshot, this);
      if (this.#canLog()) {
        ExecutionLogger.add(response, this._key, this._input);
      }

      return this.#transformResult(response);
    } catch (err) {
      const response = this.#getDefaultResultOrThrow(err);
      return this.#transformResult(response);
    }
  }

  flushExecutions() {
    ExecutionLogger.clearByKey(this._key);
  }

  #notifyError(err) {
    ExecutionLogger.notifyError(err);
  }

  async #executeApiValidation() {
    Auth.checkHealth();
    if (Auth.isTokenExpired()) {
      await this.prepare(this._key);
    }
  }

  #submit() {
    // verify if query from snapshot
    if (GlobalOptions.local && !this._forceRemote) {
      return this.executeLocalCriteria();
    }

    // otherwise, execute remote criteria or local snapshot when silent mode is enabled
    return this.validate()
      .then(() => {
        if (GlobalAuth.token === 'SILENT') {
          return this.executeLocalCriteria();
        }

        return this.executeRemoteCriteria();
      })
      .catch((err) => {
        this.#notifyError(err);

        if (GlobalOptions.silentMode) {
          Auth.updateSilentToken();
          return this.executeLocalCriteria();
        }

        throw err;
      });
  }

  #tryCachedResult() {
    if (this.#hasThrottle()) {
      if (!GlobalOptions.freeze) {
        this.scheduleBackgroundRefresh();
      }

      const cachedResultLogger = ExecutionLogger.getExecution(this._key, this._input);
      if (cachedResultLogger.key) {
        return this.#transformResult(cachedResultLogger.response);
      }
    }

    return undefined;
  }

  #validateArgs(key) {
    if (key) { 
      this._key = key; 
    }
  }

  #hasThrottle() {
    return this._delay !== 0;
  }

  #canLog() {
    return GlobalOptions.logger === true && this._key.length > 0;
  }

  #getDefaultResultOrThrow(err) {
    if (this._defaultResult === undefined) {
      throw err;
    }

    const response = SwitcherResult.create(this._defaultResult, 'Default result');

    this.#notifyError(err);
    return response;
  }

  #transformResult(result) {
    return this._showDetail ? result : result.result;
  }

}