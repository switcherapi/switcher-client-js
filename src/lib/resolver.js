const { processOperation } = require('./snapshot');
const services = require('../lib/services');

function resolveCriteria(key, input, { domain }) {
    let result = true, reason = '';

    try {
        if (!domain.activated) {
            throw new CriteriaFailed('Domain disabled');
        }

        const { group } = domain;
        if (!checkGroup(group, key, input)) {
            throw new Error(`Something went wrong: {"error":"Unable to load a key ${key}"}`);
        }

        reason = 'Success';
    } catch (e) {
        if (e instanceof CriteriaFailed) {
            result = false;
            reason = e.message;
        } else {
            throw e;
        }
    }

    return {
        result,
        reason
    };
}

/**
 * @param {*} groups from a specific Domain
 * @param {*} key to be filtered
 * @param {*} input strategy if exists
 * @return true if Switcher found
 */
function checkGroup(groups, key, input) {
    if (groups) {
        for (const group of groups) {
            const { config } = group;
            const configFound = config.filter(c => c.key === key);

            if (checkConfig(group, configFound, input)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * @param {*} group in which Switcher has been found
 * @param {*} config Switcher found
 * @param {*} input Strategy input if exists
 * @return true if Switcher found
 */
function checkConfig(group, config, input) {
    if (config[0]) {
        if (!group.activated) {
            throw new CriteriaFailed('Group disabled');
        }

        if (!config[0].activated) {
            throw new CriteriaFailed('Config disabled');
        }

        return checkStrategies(config, input);
    }

    return false;
}

function checkStrategies(config, input) {
    const { strategies } = config[0];
    for (const strategy of strategies) {
        checkStrategyInput(strategy, input);
    }

    return true;
}

function checkStrategyInput(strategy, input) {
    if (strategy.activated) {
        if (!input) {
            throw new CriteriaFailed(`Strategy '${strategy.strategy}' did not receive any input`);
        }

        const entry = services.getEntry(input);
        const entryInput = entry.filter(e => e.strategy === strategy.strategy);
        if (!processOperation(strategy.strategy, strategy.operation, entryInput[0].input, strategy.values)) {
            throw new CriteriaFailed(`Strategy '${strategy.strategy}' does not agree`);
        }
    }
}

function checkCriteriaOffline(key, input, snapshot) {
    if (!snapshot) {
        throw new Error('Snapshot not loaded. Try to use \'Switcher.loadSnapshot()\'');
    }
    
    const {  data } = snapshot;
    return resolveCriteria(key, input, data);
}

class CriteriaFailed extends Error {
    constructor(reason) {
        super(reason);
        this.name = this.constructor.name;
    }
}

module.exports = checkCriteriaOffline;