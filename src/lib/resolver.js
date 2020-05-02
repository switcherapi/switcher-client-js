const { processOperation } = require('../utils/index');
const services = require('../utils/services');

async function resolveCriteria(key, input, {
    domain
}) {
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
                strategies.forEach(function (strategy) {
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
        throw new Error(`Something went wrong: {"error":"Unable to load a key ${key}"}`)
    }

    return result;
}

async function checkCriteriaOffline(key, input, snapshot) {
    const {  data } = snapshot;
    return await resolveCriteria(key, input, data);
}

module.exports = checkCriteriaOffline;