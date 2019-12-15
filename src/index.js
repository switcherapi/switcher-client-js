"use strict";

const services = require('./utils/services')
const { loadDomain, processOperation } = require('./utils/index')

class Switcher {

  constructor(url, apiKey, domain, component, environment, offline, snapshotLocation) {
    this.url = url;
    this.apiKey = apiKey;
    this.domain = domain;
    this.component = component;
    this.environment = environment;
    this.offline = offline;
    this.snapshotLocation = snapshotLocation;
    this.bypassedKeys = new Array();
  }

  async prepare(key, input) {
    this.key = key;

    if (input) { this.input = input; }

    if (!this.offline) {
      let response = await services.auth(this.url, this.apiKey, this.domain, this.component, this.environment);
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
        throw new Error(`Something went wrong: ${errors.join(', ')}`)
    }
  }

  async isItOn(key, input) {
    const bypassKey = searchBypassed(this.key ? this.key : key, this.bypassedKeys);
    if (bypassKey) {
      return bypassKey.getValue();
    }

    if (this.offline) {
      return await checkCriteriaOffline(this.key, this.input, this.snapshotLocation);
    }

    try {
      if (key) { this.key = key; }
      if (input) { this.input = input; }
      
      await this.validate();
      return await services.checkCriteria(this.url, this.token, this.key, this.input);
    } catch (e) {
      throw e;
    }
  }

  assume(key) {
    
    const existentKey = searchBypassed(key, this.bypassedKeys);
    if (existentKey) {
      return existentKey;
    }

    const keyBypassed = new Key(key);
    this.bypassedKeys.push(keyBypassed)
    return keyBypassed;
  }

  forget(key) {
    this.bypassedKeys.splice(this.bypassedKeys.indexOf(searchBypassed(key, this.bypassedKeys)), 1); 
  }

  static get StrategiesType() {
    return StrategiesType;
  }
  
}

class Key {
  constructor(key) {
    this.key = key;
    this.value = undefined;
  }

  true() {
    this.value = true;
  }

  false() {
    this.value = false;
  }

  getKey() {
    return this.key;
  }

  getValue() {
    return this.value;
  }
}

const StrategiesType = {
  NETWORK: 'NETWORK_VALIDATION',
  VALUE: 'VALUE_VALIDATION',
  TIME: 'TIME_VALIDATION',
  DATE: 'DATE_VALIDATION'
}

function searchBypassed(key, bypassedKeys) {
  let existentKey;
  bypassedKeys.forEach(async bk => {
    if (bk.getKey() === key) {
      return existentKey = bk;
    }
  })
  return existentKey;
}

async function checkCriteriaOffline(key, input, snapshotLocation) {
  const { data } = await loadDomain(snapshotLocation);
  return await resolveCriteria(key, input, data);
}

async function resolveCriteria(key, input, { domain }) {
  const args = {}

  if (!domain.activated) {
    return false;
  }

  let result = true;
  let notFoundKey = true;
  const { group } = domain;
  if (group) {
    group.forEach(function (g) {
      
      const { config } = g;
      const configFound = config.filter(c => c.key === key)

      if (configFound[0]) {
        notFoundKey = false;
        if (!g.activated) {
          return result = false;
        }

        if (!configFound[0].activated) {
          return result = false;
        }
        
        const { strategies } = configFound[0]
        strategies.forEach(function(strategy) {
          if (strategy.activated) {
            if (!input) {
              return result = false;
            }

            const entry = services.getEntry(input);
            const entryInput = entry.filter(e => e.strategy === strategy.strategy)
            if (!processOperation(strategy.strategy, strategy.operation, entryInput[0].input, strategy.values)) {
              return result = false;
            }
          }
        })
      }
    })
  }

  if (notFoundKey) {
    throw new Error(`Offline - Something went wrong: {"error":"Unable to load a key ${key}"}`)
  }

  return result;
}

module.exports = Switcher;