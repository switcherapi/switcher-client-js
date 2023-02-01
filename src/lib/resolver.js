const { processOperation } = require('./snapshot');
const services = require('../lib/remote');

async function resolveCriteria(key, input, { domain }) {
    let result = true, reason = '';

    try {
        if (!domain.activated) {
            throw new CriteriaFailed('Domain disabled');
        }

        const { group } = domain;
        if (!(await checkGroup(group, key, input))) {
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
async function checkGroup(groups, key, input) {
    if (groups) {
        for (const group of groups) {
            const { config } = group;
            const configFound = config.filter(c => c.key === key);

            // Switcher Configs are always supplied as the snapshot is loaded from components linked to the Switcher.
            if (await checkConfig(group, configFound[0], input)) {
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
async function checkConfig(group, config, input) {
    if (!config)
        return false;

    if (!group.activated) {
        throw new CriteriaFailed('Group disabled');
    }

    if (!config.activated) {
        throw new CriteriaFailed('Config disabled');
    }

    if (config.strategies) {
        return await checkStrategy(config, input);
    }

    return true;
}

async function checkStrategy(config, input) {
    const { strategies } = config;
    const entry = services.getEntry(input);

    for (const strategy of strategies) {
        if (!strategy.activated) 
            continue;

        await checkStrategyInput(entry, strategy);
    }

    return true;
}

async function checkStrategyInput(entry, { strategy, operation, values }) {
    if (entry && entry.length) {
        const strategyEntry = entry.filter(e => e.strategy === strategy);
        if (strategyEntry.length == 0 || !(await processOperation(strategy, operation, strategyEntry[0].input, values))) {
            throw new CriteriaFailed(`Strategy '${strategy}' does not agree`);
        }
    } else {
        throw new CriteriaFailed(`Strategy '${strategy}' did not receive any input`);
    }
}

async function checkCriteriaOffline(key, input, snapshot) {
    if (!snapshot) {
        throw new Error('Snapshot not loaded. Try to use \'Switcher.loadSnapshot()\'');
    }
    
    const {  data } = snapshot;
    return await resolveCriteria(key, input, data);
}

class CriteriaFailed extends Error {
    constructor(reason) {
        super(reason);
        this.name = this.constructor.name;
    }
}

module.exports = checkCriteriaOffline;