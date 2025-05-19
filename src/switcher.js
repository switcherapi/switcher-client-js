import Bypasser from './lib/bypasser/index.js';
import ExecutionLogger from './lib/utils/executionLogger.js';
import checkCriteriaLocal from './lib/resolver.js';
import { StrategiesType } from './lib/snapshot.js';
import { Client } from './client.js';
import * as remote from './lib/remote.js';
import * as util from './lib/utils/index.js';
import { Auth } from './lib/remote-auth.js';
import { GlobalAuth } from './lib/globals/globalAuth.js';

export class Switcher {
  #delay = 0;
  #nextRun = 0;
  #input;
  #key = '';
  #defaultResult;
  #forceRemote = false;
  #showDetail = false;

  constructor(key) {
    this.#validateArgs(key);
  }

  async prepare(key) {
    this.#validateArgs(key);

    if (!Client.options.local || this.#forceRemote) {
      await Auth.auth();
    }
  }

  async validate() {
    let errors = [];

    Auth.isValid();

    if (!this.#key) {
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
    const bypassKey = Bypasser.searchBypassed(this.#key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this.#input, []));
      return this.#showDetail ? response : response.result;
    }

    try {
      // verify if query from local snapshot
      if (Client.options.local && !this.#forceRemote) {
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
      
      if (Client.options.silentMode) {
        Auth.updateSilentToken();
        return this._executeLocalCriteria();
      }
      
      throw err;
    }
    
    return result;
  }

  throttle(delay) {
    this.#delay = delay;

    if (delay > 0) {
      Client.options.logger = true;
    }

    return this;
  }

  remote(forceRemote = true) {
    if (!Client.options.local) {
      throw new Error('Local mode is not enabled');
    }
    
    this.#forceRemote = forceRemote;
    return this;
  }

  detail(showDetail = true) {
    this.#showDetail = showDetail;
    return this;
  }

  defaultResult(defaultResult) {
    this.#defaultResult = defaultResult;
    return this;
  }

  check(startegyType, input) {
    if (!this.#input) {
      this.#input = [];
    }

    this.#input.push([startegyType, input]);
    return this;
  }

  checkValue(input) {
    return this.check(StrategiesType.VALUE, input);
  }

  checkNumeric(input) {
    return this.check(StrategiesType.NUMERIC, input);
  }

  checkNetwork(input) {
    return this.check(StrategiesType.NETWORK, input);
  }

  checkDate(input) {
    return this.check(StrategiesType.DATE, input);
  }

  checkTime(input) {
    return this.check(StrategiesType.TIME, input);
  }

  checkRegex(input) {
    return this.check(StrategiesType.REGEX, input);
  }
  
  checkPayload(input) {
    return this.check(StrategiesType.PAYLOAD, input);
  }

  async _executeRemoteCriteria() {
    let responseCriteria;

    if (this.#useSync()) {
      try {
        responseCriteria = await remote.checkCriteria(
          this.#key, 
          this.#input, 
          this.#showDetail
        );
      } catch (err) {
        responseCriteria = this.#getDefaultResultOrThrow(err);
      }
      
      if (Client.options.logger && this.#key) {
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

      if (Auth.isTokenExpired()) {
        this.prepare(this.#key)
          .then(() => this.#executeAsyncCheckCriteria())
          .catch(err => this.#notifyError(err));
      } else {
        this.#executeAsyncCheckCriteria();
      }
    }

    const executionLog = ExecutionLogger.getExecution(this.#key, this.#input);
    return executionLog.response;
  }

  #executeAsyncCheckCriteria() {
    remote.checkCriteria(this.#key, this.#input, this.#showDetail)
      .then(response => ExecutionLogger.add(response, this.#key, this.#input))
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
      await this.prepare(this.#key);
    }
  }

  async _executeLocalCriteria() {
    let response;
    try {
      response = await checkCriteriaLocal(
        util.get(this.#key, ''), 
        util.get(this.#input, []), 
        Client.snapshot
      );
    } catch (err) {
      response = this.#getDefaultResultOrThrow(err);
    }

    if (Client.options.logger) {
      ExecutionLogger.add(response, this.#key, this.#input);
    }

    if (this.#showDetail) {
      return response;
    }

    return response.result;
  }

  #validateArgs(key) {
    if (key) { 
      this.#key = key; 
    }
  }

  #useSync() {
    return this.#delay == 0 || !ExecutionLogger.getExecution(this.#key, this.#input);
  }

  #getDefaultResultOrThrow(err) {
    if (this.#defaultResult === undefined) {
      throw err;
    }

    const response = {
      result: this.#defaultResult,
      reason: 'Default result'
    };

    this.#notifyError(err);
    return response;
  }

  get key() {
    return this.#key;
  }

  get input() {
    return this.#input;
  }

}