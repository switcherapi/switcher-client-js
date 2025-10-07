import { processOperation } from './snapshot.js';
import { getEntry } from '../lib/remote.js';
import * as util from '../lib/utils/index.js';
import { SwitcherResult } from './result.js';

/**
 * Resolves the criteria for a given switcher request against the snapshot domain.
 * 
 * @param {Domain} domain - The domain containing groups and configurations.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {SwitcherResult} - The result of the switcher evaluation.
 */
function resolveCriteria(domain, switcher) {
    if (!domain.activated) {
        return SwitcherResult.disabled('Domain disabled');
    }

    const { group } = domain;
    return checkGroup(group, switcher);
}

/**
 * Checks if a switcher is valid within a specific group of the domain.
 * 
 * @param {Group[]} groups - The list of groups to check against.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {SwitcherResult} - The result of the switcher evaluation.
 * @throws {Error} - If the switcher key is not found in any group.
 */
function checkGroup(groups, switcher) {
    const key = util.get(switcher.key, '');

    for (const group of groups) {
        const { config } = group;
        const configFound = config.filter(c => c.key === key);

        if (configFound.length) {
            if (!group.activated) {
                return SwitcherResult.disabled('Group disabled');
            }

            return checkConfig(configFound[0], switcher);
        }
    }

    throw new Error(
        `Something went wrong: {"error":"Unable to load a key ${switcher.key}"}`,
    );
}

/**
 * Checks if a switcher is valid within a specific configuration.
 * 
 * @param {Config} config Configuration to check
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @return {SwitcherResult} - The result of the switcher evaluation.
 */
function checkConfig(config, switcher) {
    if (!config.activated) {
        return SwitcherResult.disabled('Config disabled');
    }

    if (hasRelayEnabled(config) && switcher.isRelayRestricted) {
        return SwitcherResult.disabled('Config has Relay enabled');
    }

    if (config.strategies) {
        return checkStrategy(config, switcher.input);
    }

    return SwitcherResult.enabled();
}

/**
 * Checks if a switcher is valid against the strategies defined in the configuration.
 * 
 * @param {Config} config - The configuration containing strategies.
 * @param {string[][]} [input] - The input data to be evaluated against the strategies.
 * @returns {SwitcherResult} - The result of the strategy evaluation.
 */
function checkStrategy(config, input) {
    const { strategies } = config;
    const entry = getEntry(util.get(input, []));

    for (const strategyConfig of strategies) {
        if (!strategyConfig.activated) {
            continue;
        }

        const strategyResult = checkStrategyConfig(strategyConfig, entry);
        if (strategyResult) {
            return strategyResult;
        }
    }

    return SwitcherResult.enabled();
}

/**
 * Checks if a strategy configuration is valid against the provided entry data.
 * 
 * @param {Strategy} strategyConfig - The strategy configuration to be checked.
 * @param {Entry[]} [entry] - The entry data to be evaluated against the strategy.
 * @returns {SwitcherResult | undefined} - The result of the strategy evaluation or undefined if valid.
 */
function checkStrategyConfig(strategyConfig, entry) {
    if (!entry?.length) {
        return SwitcherResult.disabled(`Strategy '${strategyConfig.strategy}' did not receive any input`);
    }

    const strategyEntry = entry.filter((e) => e.strategy === strategyConfig.strategy);
    if (isStrategyFulfilled(strategyEntry, strategyConfig)) {
        return SwitcherResult.disabled(`Strategy '${strategyConfig.strategy}' does not agree`);
    }

    return undefined;
}

function hasRelayEnabled(config) {
    return config.relay?.activated;
}

function isStrategyFulfilled(strategyEntry, strategyConfig) {
    return strategyEntry.length == 0 || !processOperation(strategyConfig, strategyEntry[0].input);
}

/**
 * Checks the criteria for a switcher request against the local snapshot.
 * 
 * @param {Snapshot | undefined} snapshot - The snapshot containing the domain to check against.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {SwitcherResult} - The result of the switcher evaluation.
 * @throws {Error} - If the snapshot is not loaded.
 */
export default function checkCriteriaLocal(snapshot, switcher) {
    if (!snapshot) {
        throw new Error('Snapshot not loaded. Try to use \'Client.loadSnapshot()\'');
    }

    const { domain } = snapshot;
    return resolveCriteria(domain, switcher);
}