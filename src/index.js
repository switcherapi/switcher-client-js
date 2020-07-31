"use strict";

const Bypasser = require('./lib/bypasser');
const ExecutionLogger = require('./lib/executionLogger');
const { loadDomain, StrategiesType } = require('./utils/index');
const services = require('./lib/services');
const checkCriteriaOffline = require('./lib/resolver');
const validateSnapshot = require('./lib/snapshot');
const fs = require('fs');

const DEFAULT_SNAPSHOT_LOCATION = './snapshot/';
const DEFAULT_RETRY_TIME = '5m';
const DEFAULT_OFFLINE = false;
const DEFAULT_LOGGER = false;

class Switcher {

  constructor(url, apiKey, domain, component, environment, options) {
    this.url = url;
    this.apiKey = apiKey;
    this.domain = domain;
    this.component = component;
    this.environment = environment;

    // Default values
    this.offline = DEFAULT_OFFLINE;
    this.snapshotLocation = DEFAULT_SNAPSHOT_LOCATION;
    this.logger = DEFAULT_LOGGER;

    if (options) {
      if ('offline' in options) {
        this.offline = options.offline;
      }

      if ('snapshotLocation' in options) {
        this.snapshotLocation = options.snapshotLocation;
      }

      if ('silentMode' in options) {
        this.silentMode = options.silentMode;
      }

      if ('logger' in options) {
        this.logger = options.logger;
      }

      if ('retryAfter' in options) {
        this.retryTime =  options.retryAfter.slice(0, -1);
        this.retryDurationIn = options.retryAfter.slice(-1);
      } else {
        this.retryTime = DEFAULT_RETRY_TIME.charAt(0);
        this.retryDurationIn = DEFAULT_RETRY_TIME.charAt(1);
      }
    }

    this.loadSnapshot();
  }

  async prepare(key, input) {
    this.key = key;

    if (input) { this.input = input; }

    if (!this.offline) {
      let response = await services.auth(this.url, this.apiKey, this.domain, this.component, this.environment, {
        silentMode: this.silentMode,
        retryTime: this.retryTime,
        retryDurationIn: this.retryDurationIn
      });
      
      this.token = response.token;
      this.exp = response.exp;
    }
  }

  async validate() {
    let errors = [];

    if (!this.apiKey) {
      errors.push('Missing API Key field');
    }

    if (!this.component) {
      errors.push('Missing component field');
    }

    if (!this.key) {
      errors.push('Missing key field');
    }

    if (!this.url) {
      errors.push('Missing url field');
    }

    if (!this.exp || Date.now() > (this.exp*1000)) {
      await this.prepare(this.key, this.input);
    }

    if (!this.token) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  async isItOn(key, input, showReason = false) {
    const bypassKey = Bypasser.searchBypassed(this.key ? this.key : key);
    if (bypassKey) {
      return bypassKey.getValue();
    }

    if (this.offline) {
      const result = checkCriteriaOffline(
        this.key ? this.key : key, this.input ? this.input : input, this.snapshot);

      ExecutionLogger.add(this.key, result);
      return result;
    }

    if (key) { this.key = key; }
    if (input) { this.input = input; }
    
    await this.validate();
    if (this.token === 'SILENT') {
      const result = checkCriteriaOffline(
        this.key ? this.key : key, this.input ? this.input : input, this.snapshot);

      if (this.logger) ExecutionLogger.add(this.key, result);
      return result;
    } else {
      const response = await services.checkCriteria(
        this.url, this.token, this.key, this.input, showReason);

      if (this.logger) ExecutionLogger.add(this.key, response);
      return response.result;
    }
  }

  async checkSnapshot() {
    if (!this.exp || Date.now() > (this.exp*1000)) {
      const response = await services.auth(this.url, this.apiKey, this.domain, this.component, this.environment, {
        silentMode: this.silentMode,
        retryTime: this.retryTime,
        retryDurationIn: this.retryDurationIn
      });
      
      this.token = response.token;
      this.exp = response.exp;

      const result = await validateSnapshot(
        this.url, this.token, this.domain, this.environment, this.snapshotLocation, this.snapshot.data.domain.version);
      
      if (result) {
        this.loadSnapshot();
        return true;
      }
    }
    return false;
  }

  isItOnPromise(key, input, showReason = false) {
    return new Promise((resolve) => resolve(this.isItOn(key, input, showReason)));
  }

  loadSnapshot() {
    if (this.snapshotLocation) {
      const snapshotFile = `${this.snapshotLocation}${this.environment}.json`;
      this.snapshot = loadDomain(snapshotFile);

      fs.unwatchFile(snapshotFile);
      fs.watchFile(snapshotFile, (curr, prev) => {
        this.snapshot = loadDomain(snapshotFile);
      });
    }
  }

  unloadSnapshot() {
    if (this.snapshotLocation) {
      const snapshotFile = `${this.snapshotLocation}${this.environment}.json`;
      this.snapshot = undefined;
      fs.unwatchFile(snapshotFile);
    }
  }

  static get StrategiesType() {
    return StrategiesType;
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
  
}

module.exports = Switcher;