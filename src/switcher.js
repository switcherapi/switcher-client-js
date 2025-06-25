import Bypasser from './lib/bypasser/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import checkCriteriaLocal from './lib/resolver.js';
import * as remote from './lib/remote.js';
import * as util from './lib/utils/index.js';
import { Auth } from './lib/remoteAuth.js';
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

  async isItOn(key) {
    let result;
    this.#validateArgs(key);
    
    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this._input, []));
      return this._showDetail ? response : response.result;
    }

    try {
      // verify if query from local snapshot
      if (GlobalOptions.local && !this._forceRemote) {
        return await this._executeLocalCriteria();
      }

      // otherwise, execute remote criteria or local snapshot when silent mode is enabled
      await this.validate();
      if (GlobalAuth.token === 'SILENT') {
        result = await this._executeLocalCriteria();
      } else {
        result = await this._executeRemoteCriteria();
      }
    } catch (err) {
      this.#notifyError(err);
      
      if (GlobalOptions.silentMode) {
        Auth.updateSilentToken();
        return this._executeLocalCriteria();
      }
      
      throw err;
    }
    
    return result;
  }

  async _executeRemoteCriteria() {
    let responseCriteria;

    if (this.#useSync()) {
      try {
        responseCriteria = await remote.checkCriteria(
          this._key, 
          this._input, 
          this._showDetail
        );
      } catch (err) {
        responseCriteria = this.#getDefaultResultOrThrow(err);
      }
      
      if (GlobalOptions.logger && this._key) {
        ExecutionLogger.add(responseCriteria, this._key, this._input);
      }
    } else {
      responseCriteria = this._executeAsyncRemoteCriteria();
    }
    
    return this._showDetail ? responseCriteria : responseCriteria.result;
  }

  _executeAsyncRemoteCriteria() {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;

      if (Auth.isTokenExpired()) {
        this.prepare(this._key)
          .then(() => this.#executeAsyncCheckCriteria())
          .catch(err => this.#notifyError(err));
      } else {
        this.#executeAsyncCheckCriteria();
      }
    }

    const executionLog = ExecutionLogger.getExecution(this._key, this._input);
    return executionLog.response;
  }

  #executeAsyncCheckCriteria() {
    remote.checkCriteria(this._key, this._input, this._showDetail)
      .then(response => ExecutionLogger.add(response, this._key, this._input))
      .catch(err => this.#notifyError(err));
  }

  #notifyError(err) {
    ExecutionLogger.notifyError(err);
  }

  async #executeApiValidation() {
    if (!this.#useSync()) {
      return;
    }

    Auth.checkHealth();
    if (Auth.isTokenExpired()) {
      await this.prepare(this._key);
    }
  }

  async _executeLocalCriteria() {
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

  #validateArgs(key) {
    if (key) { 
      this._key = key; 
    }
  }

  #useSync() {
    return this._delay == 0 || !ExecutionLogger.getExecution(this._key, this._input);
  }

  #getDefaultResultOrThrow(err) {
    if (this._defaultResult === undefined) {
      throw err;
    }

    const response = {
      result: this._defaultResult,
      reason: 'Default result'
    };

    this.#notifyError(err);
    return response;
  }

}