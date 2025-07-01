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

  isItOn(key) {
    this.#validateArgs(key);
    
    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this._input, []));
      return this._showDetail ? response : response.result;
    }

    // try to get cached result
    const cachedResult = this.#tryCachedResult();
    if (cachedResult) {
      return cachedResult;
    }
    
    return this.#submit();
  }

  /**
   * Schedules background refresh of the last criteria request
   */
  scheduleBackgroundRefresh() {
    const now = Date.now();
    if (now > this._nextRefreshTime) {
      this._nextRefreshTime = now + this._delay;
      queueMicrotask(() => this.#submit().catch((err) => this._notifyError(err)));
    }
  }

  /**
   * Execute criteria from remote API
   */
  async executeRemoteCriteria() {
    let responseCriteria;

    try {
      responseCriteria = await remote.checkCriteria(
        this._key,
        this._input,
        this._showDetail,
      );
    } catch (err) {
      responseCriteria = this.#getDefaultResultOrThrow(err);
    }

    if (GlobalOptions.logger && this._key) {
      ExecutionLogger.add(responseCriteria, this._key, this._input);
    }

    return this._showDetail ? responseCriteria : responseCriteria.result;
  }

  async executeLocalCriteria() {
    let response;

    try {
      response = await checkCriteriaLocal(GlobalSnapshot.snapshot, this);
    } catch (err) {
      response = this.#getDefaultResultOrThrow(err);
    }

    if (GlobalOptions.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    if (this._showDetail) {
      return response;
    }

    return response.result;
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

  async #submit() {
    try {
      // verify if query from local snapshot
      if (GlobalOptions.local && !this._forceRemote) {
        return await this.executeLocalCriteria();
      }

      // otherwise, execute remote criteria or local snapshot when silent mode is enabled
      await this.validate();
      if (GlobalAuth.token === 'SILENT') {
        return await this.executeLocalCriteria();
      }

      return await this.executeRemoteCriteria();
    } catch (err) {
      this.#notifyError(err);
      
      if (GlobalOptions.silentMode) {
        Auth.updateSilentToken();
        return this.executeLocalCriteria();
      }
      
      throw err;
    }
  }

  #tryCachedResult() {
    if (this.#hasThrottle()) {
      if (!GlobalOptions.static) {
        this.scheduleBackgroundRefresh();
      }

      const cachedResultLogger = ExecutionLogger.getExecution(this._key, this._input);
      if (cachedResultLogger.key) {
        return this._showDetail ? cachedResultLogger.response : cachedResultLogger.response.result;
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

  #getDefaultResultOrThrow(err) {
    if (this._defaultResult === undefined) {
      throw err;
    }

    const response = SwitcherResult.create(this._defaultResult, 'Default result');

    this.#notifyError(err);
    return response;
  }

}